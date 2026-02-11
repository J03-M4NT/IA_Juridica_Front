/**
 * Script de debugging para diagnosticar problemas de Firebase
 * 
 * INSTRUCCIONES:
 * 1. Abre la consola del navegador (F12)
 * 2. Copia y pega este código completo
 * 3. Ejecuta: await debugFirebase()
 */

import { db, storage } from '../firebase/firebaseConfig';
import { auth } from '../boot/firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

export async function debugFirebase() {
    console.log('🔍 === INICIANDO DIAGNÓSTICO DE FIREBASE ===');

    // 1. Verificar usuario autenticado
    console.log('');
    console.log('👤 PASO 1: Verificando autenticación');
    const user = auth.currentUser;

    if (!user) {
        console.error('❌ NO hay usuario autenticado');
        console.log('Solución: Inicia sesión primero');
        return;
    }

    console.log('✅ Usuario autenticado:', {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName
    });

    // 2. Verificar configuración de Firebase
    console.log('');
    console.log('⚙️ PASO 2: Verificando configuración');
    console.log('Configuración de Firebase:', {
        apiKey: auth.app.options.apiKey?.substring(0, 10) + '...',
        projectId: auth.app.options.projectId,
        authDomain: auth.app.options.authDomain
    });

    // 3. Probar escritura en Firestore
    console.log('');
    console.log('📝 PASO 3: Probando escritura en Firestore');
    const testDocRef = doc(db, 'users', user.uid);

    try {
        const testData = {
            uid: user.uid,
            email: user.email || 'test@example.com',
            displayName: 'Test Usuario',
            photoURL: null,
            testField: 'Prueba de escritura - ' + new Date().toISOString(),
            timestamp: new Date()
        };

        console.log('Intentando escribir:', testData);
        await setDoc(testDocRef, testData);
        console.log('✅ ESCRITURA EXITOSA en Firestore');

        // 4. Probar lectura
        console.log('');
        console.log('📖 PASO 4: Probando lectura en Firestore');
        const docSnap = await getDoc(testDocRef);

        if (docSnap.exists()) {
            console.log('✅ LECTURA EXITOSA');
            console.log('Datos leídos:', docSnap.data());
        } else {
            console.warn('⚠️ No se encontró el documento después de escribir');
        }

    } catch (error: any) {
        console.error('❌ ERROR EN FIRESTORE:', error);
        console.error('Código de error:', error.code);
        console.error('Mensaje:', error.message);

        if (error.code === 'permission-denied') {
            console.log('');
            console.log('🔒 PROBLEMA IDENTIFICADO: PERMISOS DENEGADOS');
            console.log('');
            console.log('SOLUCIÓN:');
            console.log('1. Ve a Firebase Console: https://console.firebase.google.com');
            console.log('2. Selecciona tu proyecto: lexit-ai');
            console.log('3. Ve a Firestore Database → Reglas');
            console.log('4. Reemplaza las reglas con:');
            console.log('');
            console.log(`rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
  }
}`);
            console.log('');
            console.log('5. Haz clic en "Publicar"');
            return;
        }
    }

    // 5. Probar Storage (solo si hay un archivo de prueba)
    console.log('');
    console.log('💾 PASO 5: Información de Storage');
    console.log('Storage bucket:', storage.app.options.storageBucket);
    console.log('Para probar Storage, necesitas subir una imagen desde la UI');

    console.log('');
    console.log('🎉 === DIAGNÓSTICO COMPLETADO ===');
    console.log('');
    console.log('Si viste ✅ en todos los pasos, Firebase está funcionando correctamente.');
    console.log('Si viste ❌, sigue las instrucciones de solución mostradas arriba.');
}

// Para usar en la consola del navegador:
// 1. Importa esta función en algún componente o
// 2. Copia el código completo y pégalo en la consola
// 3. Ejecuta: debugFirebase()

// También puedes exportarla para usarla en un botón temporal
export default debugFirebase;
