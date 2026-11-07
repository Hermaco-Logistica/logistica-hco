/** Singular si n es 1; plural en cualquier otro caso (0 incluido). `plural` por defecto añade "s". */
export const pluralizar = (n, singular, plural = `${singular}s`) => (Number(n) === 1 ? singular : plural);
