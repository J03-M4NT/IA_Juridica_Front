import app, { auth, db, storage } from '../firebase/firebaseConfig'
import { getAnalytics } from 'firebase/analytics'

const analytics = getAnalytics(app)

export { auth, analytics, db, storage }
export default app
