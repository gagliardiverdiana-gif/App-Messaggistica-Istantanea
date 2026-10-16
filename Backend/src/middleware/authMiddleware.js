const jwt = require('jsonwebtoken'); // auth controlla che la richiesta contenga il token jwt nell header authorization e che l'utente sia loggato.       

module.exports = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ message: 'Token mancante' }); // Controlla se l'header di autorizzazione è presente  

    const token = authHeader.split(' ')[1]; // Estrae il token dal formato "Bearer <token> e salva i dati in req.user, se manca errore"
    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ message: 'Token non valido' });
        req.user = user;
        next();
    });
};