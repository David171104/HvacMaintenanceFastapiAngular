import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

export const authGuard: CanActivateFn = () => {
  const router = inject(Router);
  const token = localStorage.getItem('access_token');

  if (token) {
    return true; // ← tiene token, puede entrar
  }

  router.navigate(['/login']); // ← no tiene token, al login
  return false;
};