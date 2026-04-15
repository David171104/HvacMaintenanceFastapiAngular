import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivateFn, Router, RouterStateSnapshot } from '@angular/router';
import Swal from 'sweetalert2';

import { PermissionAction, PermissionService } from './permission.service';

type RoutePermissionData = {
  module?: string;
  action?: PermissionAction;
  roles?: string[];
};

export const routePermissionGuard: CanActivateFn = (
  route: ActivatedRouteSnapshot,
  state: RouterStateSnapshot,
) => {
  const router = inject(Router);
  const permissionService = inject(PermissionService);

  if (!localStorage.getItem('access_token')) {
    return router.createUrlTree(['/login']);
  }

  const requiredPermission = route.data['permission'] as RoutePermissionData | undefined;
  const currentRole = localStorage.getItem('userRole') || '';

  if (requiredPermission?.roles?.length && !requiredPermission.roles.includes(currentRole)) {
    return router.createUrlTree([getFallbackRoute(currentRole)]);
  }

  if (!requiredPermission?.module) {
    return true;
  }

  const action = requiredPermission.action ?? 'can_view';
  if (permissionService.hasPermission(requiredPermission.module, action)) {
    return true;
  }

  void Swal.fire({
    title: 'Acceso denegado',
    text: `No tienes permiso para ver ${requiredPermission.module}.`,
    icon: 'warning',
    confirmButtonText: 'Entendido',
  });

  const fallbackRoute = getFallbackRoute(currentRole);

  if (state.url === fallbackRoute) {
    return false;
  }

  return router.createUrlTree([fallbackRoute]);
};

function getFallbackRoute(role: string): string {
  const homeByRole: Record<string, string> = {
    administrador: '/home',
    tecnico: '/tecnic-home',
    cliente: '/client-home',
  };
  return homeByRole[role] || '/home';
}
