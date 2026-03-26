import unittest
from datetime import date, datetime, time, timedelta
from types import SimpleNamespace

from pydantic import ValidationError

from app.iot_analysis import build_delta, interpret_comparison, summarize_period
from app.models.iot_reading_model import LecturaIn
from app.models.login.user_login_model import UserLogin
from app.models.services.service_model import Service
from app.models.users.user_model import User


class UserValidationTests(unittest.TestCase):
    def test_user_trims_and_accepts_valid_payload(self):
        user = User(
            name="  Ana  ",
            last_name="  Perez ",
            email="  ana@example.com ",
            document_number=" 123456 ",
            age=" 25 ",
            password=" Str0ng!Pass ",
            role_id=3,
        )

        self.assertEqual(user.name, "Ana")
        self.assertEqual(user.last_name, "Perez")
        self.assertEqual(user.email, "ana@example.com")
        self.assertEqual(user.document_number, "123456")
        self.assertEqual(user.age, 25)
        self.assertEqual(user.password, "Str0ng!Pass")

    def test_user_rejects_weak_password(self):
        with self.assertRaises(ValidationError):
            User(
                name="Ana",
                last_name="Perez",
                email="ana@example.com",
                password="weakpass",
            )

    def test_user_rejects_non_numeric_document(self):
        with self.assertRaises(ValidationError):
            User(
                name="Ana",
                last_name="Perez",
                email="ana@example.com",
                document_number="ABC123",
            )

    def test_user_rejects_age_out_of_range(self):
        with self.assertRaises(ValidationError):
            User(
                name="Ana",
                last_name="Perez",
                email="ana@example.com",
                age=10,
            )

    def test_user_accepts_accented_compound_names(self):
        user = User(
            name="  María Fernanda ",
            last_name=" Soto Martínez ",
            email="maria@example.com",
            role_id=3,
        )

        self.assertEqual(user.name, "María Fernanda")
        self.assertEqual(user.last_name, "Soto Martínez")

    def test_user_rejects_name_with_numbers_or_symbols(self):
        with self.assertRaises(ValidationError):
            User(
                name="Jonathan123",
                last_name="P3dro",
                email="ana@example.com",
                role_id=3,
            )


class LoginValidationTests(unittest.TestCase):
    def test_login_trims_credentials(self):
        login = UserLogin(email="  user@example.com ", password=" secret ")

        self.assertEqual(login.email, "user@example.com")
        self.assertEqual(login.password, "secret")

    def test_login_rejects_blank_password(self):
        with self.assertRaises(ValidationError):
            UserLogin(email="user@example.com", password="   ")


class ServiceValidationTests(unittest.TestCase):
    def test_service_rejects_past_date(self):
        with self.assertRaises(ValidationError):
            Service(
                client_id=1,
                request_date=date.today() - timedelta(days=1),
                request_time=time(9, 0),
                service_type="Correctivo",
                address="Calle 123 #45-67",
            )

    def test_service_rejects_time_outside_business_hours(self):
        with self.assertRaises(ValidationError):
            Service(
                client_id=1,
                request_date=date.today(),
                request_time=time(18, 0),
                service_type="Correctivo",
                address="Calle 123 #45-67",
            )

    def test_service_rejects_short_address(self):
        with self.assertRaises(ValidationError):
            Service(
                client_id=1,
                request_date=date.today(),
                request_time=time(10, 0),
                service_type="Correctivo",
                address="corta",
            )


class IoTValidationTests(unittest.TestCase):
    def test_iot_accepts_valid_manual_payload(self):
        lectura = LecturaIn(
            temperatura=20,
            humedad=50,
            corriente=10,
            fecha_hora_manual=datetime.now() - timedelta(minutes=5),
            equipo_id=" mini-01 ",
            observacion="  Revision manual estable ",
        )

        self.assertEqual(lectura.equipo_id, "mini-01")
        self.assertEqual(lectura.observacion, "Revision manual estable")

    def test_iot_rejects_temperature_out_of_range(self):
        with self.assertRaises(ValidationError):
            LecturaIn(temperatura=120, humedad=50, corriente=10, equipo_id="mini-01")

    def test_iot_rejects_future_manual_datetime(self):
        with self.assertRaises(ValidationError):
            LecturaIn(
                temperatura=20,
                humedad=50,
                corriente=10,
                fecha_hora_manual=datetime.now() + timedelta(minutes=5),
                equipo_id="mini-01",
            )

    def test_iot_rejects_missing_equipment(self):
        with self.assertRaises(ValidationError):
            LecturaIn(
                temperatura=20,
                humedad=50,
                corriente=10,
                equipo_id="   ",
            )

    def test_iot_rejects_nan_values(self):
        with self.assertRaises(ValidationError):
            LecturaIn(
                temperatura=float("nan"),
                humedad=50,
                corriente=10,
                equipo_id="mini-01",
            )


class IoTComparisonTests(unittest.TestCase):
    def test_summary_and_interpretation_detect_improvement(self):
        before = summarize_period(
            [
                SimpleNamespace(
                    fecha_hora=datetime(2026, 3, 20, 8, 0),
                    temperatura=25.0,
                    humedad=60.0,
                    corriente=8.5,
                ),
                SimpleNamespace(
                    fecha_hora=datetime(2026, 3, 20, 9, 0),
                    temperatura=24.5,
                    humedad=58.0,
                    corriente=8.0,
                ),
            ]
        )
        after = summarize_period(
            [
                SimpleNamespace(
                    fecha_hora=datetime(2026, 3, 22, 8, 0),
                    temperatura=23.0,
                    humedad=56.0,
                    corriente=7.0,
                ),
                SimpleNamespace(
                    fecha_hora=datetime(2026, 3, 22, 9, 0),
                    temperatura=22.5,
                    humedad=55.0,
                    corriente=6.8,
                ),
            ]
        )

        delta = build_delta(before, after)
        insight = interpret_comparison(before, after, delta)

        self.assertEqual(insight.status, "improved")
        self.assertTrue(insight.has_enough_data)

    def test_summary_and_interpretation_detect_insufficient_data(self):
        before = summarize_period([])
        after = summarize_period([])
        delta = build_delta(before, after)
        insight = interpret_comparison(before, after, delta)

        self.assertEqual(insight.status, "insufficient_data")
        self.assertFalse(insight.has_enough_data)


if __name__ == "__main__":
    unittest.main()
