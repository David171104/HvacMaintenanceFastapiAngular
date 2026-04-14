export const STATUS_LABELS: any = {
  pending: 'Pendiente',
  assigned: 'Asignado',
  completed: 'Completado'
};

export function getStatusLabel(status: string): string {

  switch (status) {

    case "pending":
      return `
        <span class="status-icon status-pending">
          <i class="fas fa-hourglass-half"></i>
          ${STATUS_LABELS[status]}
        </span>
      `;

    case "assigned":
      return `
        <span class="status-icon status-assigned">
          <i class="fas fa-user-check"></i>
          ${STATUS_LABELS[status]}
        </span>
      `;

    case "completed":
      return `
        <span class="status-icon status-completed">
          <i class="fas fa-check-circle"></i>
          ${STATUS_LABELS[status]}
        </span>
      `;

    default:
      return `
        <span class="status-icon status-unknown">
          <i class="fas fa-question-circle"></i>
          Desconocido
        </span>
      `;
  }
}