// Support four/five-character app passwords while meeting Auth's wire-length rule.
// This is a compatibility encoding, not password strengthening. Existing >=6
// character passwords are sent unchanged. Never store the plaintext password.
export function authPassword(value) {
  const password=String(value??'').trim();
  return password.length>=4&&password.length<6?'eaglemath:short:v1:'+password:password;
}
