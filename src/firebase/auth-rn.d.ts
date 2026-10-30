import { FirebaseApp } from '@firebase/app';
import { Auth } from '@firebase/auth';

declare module '@firebase/auth' {
  export function getReactNativePersistence(storage: any): any;
  export function initializeAuth(
    app: FirebaseApp,
    deps?: { persistence: any },
  ): Auth;
}
