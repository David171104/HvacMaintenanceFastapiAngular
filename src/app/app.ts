import { Component, OnInit, signal } from '@angular/core';
import { RouterOutlet, Router } from '@angular/router';

/* ✅ declarar msal global */
declare global {
  interface Window {
    msal: any;
  }
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit {

  protected readonly title = signal('HvacMaintenanceFastapiAngular');

  msalInstance: any;

  constructor(private router: Router) {}

  // =====================================================
  // INIT GLOBAL APP
  // =====================================================
  async ngOnInit() {

    await this.waitForMsal();

    const msalConfig = {
      auth: {
        clientId: "9390d994-fdb5-4104-b1e9-8ce7277fcd35",
        authority:
          "https://login.microsoftonline.com/1e9aabe8-67f8-4f1c-a329-a754e92499ae",
        redirectUri: "http://localhost:4200"
      }
    };

    this.msalInstance =
      new window.msal.PublicClientApplication(msalConfig);

    await this.processMicrosoftRedirect();
  }

  // =====================================================
  // ESPERAR SCRIPT MSAL
  // =====================================================
  async waitForMsal(): Promise<void> {
    return new Promise(resolve => {
      const check = () => {
        if (window.msal) resolve();
        else setTimeout(check, 50);
      };
      check();
    });
  }

  // =====================================================
  // PROCESAR REDIRECT MICROSOFT (GLOBAL)
  // =====================================================
  async processMicrosoftRedirect() {

    try {

      console.log("🔥 Procesando redirect Microsoft");

      const response =
        await this.msalInstance.handleRedirectPromise();

      if (!response) return;

      const account = response.account;

      const token =
        await this.msalInstance.acquireTokenSilent({
          scopes: ["User.Read"],
          account: account
        });

      const claims: any = token.idTokenClaims;

      const correo =
        claims?.preferred_username ||
        account.username;

      const roles = claims?.roles || [];

      console.log("Correo:", correo);
      console.log("Roles:", roles);

      localStorage.setItem("userEmail", correo);
      localStorage.setItem("userRoles", JSON.stringify(roles));

      // limpiar URL (#code=...)
      window.history.replaceState({}, document.title, "/");

      // ✅ REDIRECCIÓN GLOBAL
      if (roles.includes("Admin")) {
        this.router.navigateByUrl('/home');
      }
      else if (roles.includes("Tecnico")) {
        this.router.navigateByUrl('/techinnician-home');
      }
      else if (roles.includes("Cliente")){
        this.router.navigateByUrl('/client-home');
      }

    } catch (error) {
      console.error("Error MSAL:", error);
    }
  }
}