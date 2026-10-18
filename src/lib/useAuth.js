import { useEffect, useState } from 'react';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { auth } from './firebase';

// user === undefined -> ainda carregando; null -> sem sessão; objeto -> logado
export function useAuth() {
  const [user, setUser] = useState(undefined);

  useEffect(() => onAuthStateChanged(auth, setUser), []);

  return { user };
}

export async function login(email, password) {
  try {
    await signInWithEmailAndPassword(auth, email, password);
    return { ok: true };
  } catch {
    return { ok: false, error: 'E-mail ou senha inválidos.' };
  }
}

export function logout() {
  return signOut(auth);
}
