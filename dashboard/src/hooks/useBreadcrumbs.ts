import { useLocation } from 'react-router-dom';
import { getBreadcrumbs, BreadcrumbItem } from '@/config/breadcrumbs';

export function useBreadcrumbs(dynamicData?: Record<string, string>): BreadcrumbItem[] {
  const location = useLocation();
  return getBreadcrumbs(location.pathname, dynamicData);
}
