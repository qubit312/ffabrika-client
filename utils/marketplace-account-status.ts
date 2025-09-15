import { MarketplaceAccountStatus } from '@/types/marketplaceAccount';

export function getStatusLabel(status: MarketplaceAccountStatus | undefined): string {
  if (!status) return 'Не настроен'

  const labels = {
    [MarketplaceAccountStatus.CONNECTED]: 'Подключен',
    [MarketplaceAccountStatus.DISCONNECTED]: 'Отключен',
    [MarketplaceAccountStatus.PENDING]: 'В обработке',
    [MarketplaceAccountStatus.ERROR]: 'Ошибка',
    [MarketplaceAccountStatus.EXPIRED]: 'Токен истек',
    [MarketplaceAccountStatus.LIMITED]: 'Ограниченный доступ',
    [MarketplaceAccountStatus.SUSPENDED]: 'Заблокирован',
    [MarketplaceAccountStatus.NOT_CONFIGURED]: 'Не настроен',
  };
  
  return labels[status] || status;
}

export function getStatusColor(status: MarketplaceAccountStatus | undefined): string {
  if (!status) return 'warning'

  const colors = {
    [MarketplaceAccountStatus.CONNECTED]: 'success',
    [MarketplaceAccountStatus.DISCONNECTED]: 'warning',
    [MarketplaceAccountStatus.PENDING]: 'info',
    [MarketplaceAccountStatus.ERROR]: 'error',
    [MarketplaceAccountStatus.EXPIRED]: 'warning',
    [MarketplaceAccountStatus.LIMITED]: 'warning',
    [MarketplaceAccountStatus.SUSPENDED]: 'error',
    [MarketplaceAccountStatus.NOT_CONFIGURED]: 'secondary',
  };
  
  return colors[status] || 'secondary';
}
