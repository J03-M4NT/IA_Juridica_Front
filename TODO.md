# TODO: Fix Legal Assistant Response Display Issue

## Current Problem
- Legal assistant responses are not showing up in the chat
- Errors are set in store but not displayed in UI
- No API key validation on app start

## Tasks
- [x] Update consultas-store.ts to add error messages to mensajes array in enviarConsulta catch block
- [x] Add API key validation on ConsultasPage.vue mount
- [ ] Test the fixes by running the app and checking responses
