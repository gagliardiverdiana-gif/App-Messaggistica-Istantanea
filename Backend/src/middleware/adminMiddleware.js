module.exports = (req, res, next) => {// Questo middleware verifica se l'utente è autenticato e ha il ruolo di admin prima di consentire l'accesso alle rotte protette.
  if (!req.user) {
    return res.status(401).json({ message: 'Utente non autenticato' });// Se l'utente non è autenticato, restituisce un errore 401 (Unauthorized).
  }

  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Accesso negato: solo admin' });// Se l'utente non ha il ruolo di admin, restituisce un errore 403 (Forbidden).
  }

  next();
}; //autorizzazione verifica cosa puoi fare....autenticazione verifica chi sei...def.jwt