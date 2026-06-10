-- Add donation_refunded to NotificationType enum
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'donation_refunded';
