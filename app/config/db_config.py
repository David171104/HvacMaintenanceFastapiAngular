from dotenv import load_dotenv # environment variables
import os, mysql.connector

load_dotenv() # load environment variables

def get_db_connection():
    try:
        return mysql.connector.connect(
            host=os.getenv("MYSQL_HOST"),
            user=os.getenv("MYSQL_USER"),
            password=os.getenv("MYSQL_PASSWORD"),
            database=os.getenv("MYSQL_DB")
        )
    except mysql.connector.Error as err:
        print(f"Error de conexión: {err}")
        raise


