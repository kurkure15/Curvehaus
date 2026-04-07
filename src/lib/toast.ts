import { toast as sonnerToast } from 'sonner';
import { mobileToast } from '@/components/MobileToast';

export function toast(msg: string) {
  sonnerToast(msg);
  mobileToast(msg);
}
