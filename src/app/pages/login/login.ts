import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';


/* ✅ declarar MSAL global correctamente */
declare global {
  interface Window {
    msal: any;
  }
}

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, RouterModule],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class LoginComponent implements OnInit {

  private msalInstance: any;

  constructor(private router: Router,  private http: HttpClient) {}

  // =====================================================
  // INIT
  // =====================================================
  ngOnInit(): void {

    if (!window.msal) {
      console.error('MSAL no cargado (script CDN)');
      return;
    }

    const msalConfig = {
      auth: {
        clientId: "9390d994-fdb5-4104-b1e9-8ce7277fcd35",
        authority:
          "https://login.microsoftonline.com/1e9aabe8-67f8-4f1c-a329-a754e92499ae",
        redirectUri: "http://localhost:4200"
      }
    };

    // ✅ crear UNA sola instancia
    this.msalInstance =
      new window.msal.PublicClientApplication(msalConfig);
  }

  // =====================================================
  // LOGIN MICROSOFT
  // =====================================================
  loginMicrosoft(event: Event): void {

    // 🚨 evita submit del form
    event.preventDefault();
    event.stopPropagation();

    if (!this.msalInstance) {
      console.error("MSAL no inicializado");
      return;
    }

    console.log("🔵 Redirigiendo a Microsoft...");

    this.msalInstance.loginRedirect({
      scopes: ["User.Read"]
    });
  }

  logoutMicrosoft() {
    console.log("🔴 Cerrando sesión Microsoft...");
    // limpiar sesión local
    localStorage.clear();
    sessionStorage.clear();

    const msalConfig = {
      auth: {
        clientId: "9390d994-fdb5-4104-b1e9-8ce7277fcd35",
        authority:
          "https://login.microsoftonline.com/1e9aabe8-67f8-4f1c-a329-a754e92499ae",
        redirectUri: "http://localhost:4200"
      }
    };

    const msalInstance =
      new window.msal.PublicClientApplication(msalConfig);

      localStorage.removeItem("token");
      localStorage.removeItem("user");
    // 🔥 logout REAL Microsoft
    msalInstance.logoutRedirect({
      postLogoutRedirectUri: "http://localhost:4200"
    });
  }

  // =====================================================
  // LOGIN NORMAL
  // =====================================================
  loginData = {
    email: '',
    password: ''
  };

 onSubmit(): void {

    const body = {
      email: this.loginData.email,
      password: this.loginData.password
    };

    this.http.post<any>(
      'http://localhost:8000/users/user_login',
      body
    ).subscribe({

      next: (response) => {

        console.log("Respuesta API:", response);

        // ✅ guardar token
        localStorage.setItem(
          'access_token',
          response.access_token
        );

        // ✅ guardar usuario
        localStorage.setItem(
          'user',
          JSON.stringify(response.user)
        );

        alert('Login exitoso');

        // ✅ redirección según rol
        const role = response.user.role_id;

        if (role === 1) {
          this.router.navigateByUrl('/home');
        } else if (role === 2) {
          this.router.navigateByUrl('/techinnician-home');
        } else if (role === 3){
          this.router.navigateByUrl('/client-home');
        }else{
          this.router.navigateByUrl('/');
        }
      },

      error: (error) => {

        console.error("Error login:", error);

        if (error.error?.detail) {
          alert(error.error.detail);
        } else {
          alert("Error conectando con el servidor");
        }
      }

    });
  }

  // =====================================================
  // goToRegister(): void {
  //   this.router.navigateByUrl('/register');
  // }
}