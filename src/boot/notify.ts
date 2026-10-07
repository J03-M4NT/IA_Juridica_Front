import { boot } from 'quasar/wrappers';
import { Notify } from 'quasar';

export default boot(() => {
  Notify.setDefaults({
    position: 'top',
    timeout: 2500,
    textColor: 'white',
    actions: [{ icon: 'close', color: 'white' }]
  });

  // Errores (type: 'negative'): aviso suave en rojo claro en lugar de la
  // barra roja intensa de Quasar. Mismo estilo que .lexit-toast--error
  // (ver css/app.scss), así todos los $q.notify de error se ven igual.
  Notify.registerType('negative', {
    icon: 'error_outline',
    color: 'lexit-error-suave',
    textColor: 'lexit-error-texto',
    classes: 'lexit-toast lexit-toast--error',
    actions: [],
    timeout: 4500
  });
});

export { Notify };
