import { db, storage } from '../firebase/firebaseConfig';
import {
    collection, onSnapshot,
    query, orderBy,
    type Unsubscribe
} from 'firebase/firestore';
import { ref, getDownloadURL, getBlob } from 'firebase/storage';

/*

 La interfaz que define la estructura de un contrato almacenado
 en Firestore.

 Esto debido a que Typescript necesita saber la forma de
 los datos que vamos a recibir, de esta manera detecta
 errores antes de ejecutar el codigo.

*/

export interface ContratoFirebase {
    id: string;     // Id del doc en firestore
    name: string;   // Name contrato
    type: string;   // Tipo contrato
    storagePath: string;    // Ruta del pdf
    createdAt: Date;    // Fecha de creacion
}


/*

Ahora usamos la funcion onSnapshot para obtener los datos de 
la coleccion contratos en tiempo real.

*/

export function listenContratos(
    callback: (contratos: ContratoFirebase[]) => void,
    onError: (error: Error) => void
): Unsubscribe {

    // 1. Crear referencias a coleccion contratos:
    const contratosRef = collection(db, 'contratos');

    // 2. Creamos query ordenada por fecha de creacion (mas reciente va al inicio)
    const q = query(contratosRef, orderBy('createdAt', 'desc'));

    // 3. Establecemos el listener en tiempo real:
    const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
            // 4. Transformar doc de firestore a nuestro tipo ContratoFirebase
            const contratos: ContratoFirebase[] = snapshot.docs.map((doc) => {
                const data = doc.data();
                return {
                    id: doc.id,  // El ID del doc en Firestore
                    name: data.name,
                    type: data.type,
                    storagePath: data.storagePath,
                    // Firestore guarda las fechas como Timestamp, las convertimos a Date
                    createdAt: data.createdAt?.toDate?.() || new Date(),
                };
            });

            // 5. Llama al callback con los datos transformados
            callback(contratos);
        },

        (error) => {
            // 6. Si hay un error en la escucha, lo reportamos
            console.error('Error escuchando contratos:', error);
            onError(error);
        }
    );


    // 7. Retornamos la funcion para cancelar la escucha
    return unsubscribe;

}


/*

Aca obtendremos el URL para descargar el doc en firestore.
Usaremos getDownloadURL y getBlob.

*/

export async function getContratoDownloadURL(storagePath: string): Promise<string> {
    // ref() crea una referencia al archivo en Storage (no lo descarga aún)
    const fileRef = ref(storage, storagePath);
    // getDownloadURL() obtiene la URL firmada para acceder al archivo
    return await getDownloadURL(fileRef);
}

/*

Usamos Blob ( Binary Large Object ).
Ayuda a saber como el navegador representa un archivo en memoria.
Usando esto, podemos crear un enlace de descarga usando el:
URL.createObjectURL()

*/

export async function downloadContrato(storagePath: string): Promise<Blob> {
    const fileRef = ref(storage, storagePath);
    // getBlob() descarga el archivo completo como un Blob
    return await getBlob(fileRef);
}