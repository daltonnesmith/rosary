import * as oidc from 'openid-client';
import { EncryptJWT, jwtDecrypt } from 'jose';
import { createHash } from 'node:crypto';
import { BlobServiceClient } from '@azure/storage-blob';
import profile from '../profile/profile.cjs';
import { validateState } from '../shared/core.js';

const origin = 'https://yellow-coast-010c33a0f.3.azurestaticapps.net';
const tenant = '7b7c5f20-f533-4cde-98b3-ba9f55cb03c4';
const issuer = `https://${tenant}.ciamlogin.com/${tenant}/v2.0`;
const base = `https://stillwaterjournaldn.ciamlogin.com/${tenant}`;
const callback = `${origin}/api/email/callback`;
const clientId = '4bfc341f-bfe5-4deb-a64e-262d919dbfbf';
const flowCookie = '__Host-stillwater-flow', authCookie = '__Host-stillwater-email';
const headers = { 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer', 'X-Content-Type-Options': 'nosniff' };
const reply = (status, body, extra = {}) => ({status, body, headers, ...extra});
const cookie = (name, value, maxAge) => ({name, value, path:'/', secure:true, httpOnly:true, sameSite:'Lax', maxAge});
const key = () => Buffer.from(process.env.EMAIL_COOKIE_KEY, 'base64');
const config = () => new oidc.Configuration({
  issuer, authorization_endpoint:`${base}/oauth2/v2.0/authorize`, token_endpoint:`${base}/oauth2/v2.0/token`,
  jwks_uri:`${base}/discovery/v2.0/keys`, id_token_signing_alg_values_supported:['RS256']
}, clientId, {id_token_signed_response_alg:'RS256'}, oidc.ClientSecretPost(process.env.EMAIL_OIDC_SECRET));

async function seal(kind, claims, seconds) {
  return new EncryptJWT(claims).setProtectedHeader({alg:'dir',enc:'A256GCM'}).setAudience(kind)
    .setIssuer(origin).setIssuedAt().setExpirationTime(Math.floor(Date.now()/1000)+seconds).encrypt(key());
}
async function read(req, name) {
  const token = (req.headers.cookie || '').split(';').map(x=>x.trim()).find(x=>x.startsWith(`${name}=`))?.slice(name.length+1);
  if (!token) return null;
  try { return (await jwtDecrypt(token, key(), {issuer:origin,audience:name,keyManagementAlgorithms:['dir'],contentEncryptionAlgorithms:['A256GCM']})).payload; }
  catch { return null; }
}
function microsoft(req) {
  try {
    const p = JSON.parse(Buffer.from(req.headers['x-ms-client-principal'], 'base64').toString());
    if (p.identityProvider === 'aad' && typeof p.userId === 'string' && p.userId && p.userRoles.includes('authenticated')) return p.userId;
  } catch { /* Not authenticated through the SWA provider. */ }
  return null;
}
const container = () => BlobServiceClient.fromConnectionString(process.env.STILLWATER_STORAGE_CONNECTION).getContainerClient('profiles');
// Claim a subject once. Addresses are deliberately never used for identity or linking.
export async function resolveSubject(blob, subject, link) {
  const standalone = `email:${subject}`;
  const preferred = link || standalone;
  try {
    await blob.uploadData(Buffer.from(preferred), {conditions:{ifNoneMatch:'*'}});
    return preferred;
  } catch (e) { if (e.code !== 'BlobAlreadyExists' && e.statusCode !== 412) throw e; }
  const existing = (await blob.downloadToBuffer()).toString();
  if (link && existing !== link) throw new Error('Already associated with another journal');
  return existing;
}
export async function handle(action, req) {
  try {
    if (!['GET','POST','PUT','DELETE'].includes(req.method)) return reply(405);
    if (req.method !== 'GET' && req.headers.origin !== origin) return reply(403);
    if (action === 'start' && req.method === 'POST') {
      const link = req.headers['x-stillwater-link'];
      if (link && link !== microsoft(req)) return reply(403);
      if (!link && microsoft(req)) return reply(409, {error:'Sign out of Microsoft before opening a separate email account.'});
      const verifier = oidc.randomPKCECodeVerifier(), state = oidc.randomState(), nonce = oidc.randomNonce();
      const url = oidc.buildAuthorizationUrl(config(), {redirect_uri:callback,response_type:'code',scope:'openid email profile',
        code_challenge:await oidc.calculatePKCECodeChallenge(verifier),code_challenge_method:'S256',state,nonce,prompt:'login'});
      return reply(200,{url:url.href},{cookies:[cookie(flowCookie,await seal(flowCookie,{state,nonce,verifier,link:link||null},600),600)]});
    }
    if (action === 'callback' && req.method === 'GET') {
      const f = await read(req,flowCookie);
      if (!f || (f.link || null) !== microsoft(req)) return reply(403,'Sign-in session changed or expired. Return to Stillwater and start again.');
      const url = new URL(callback); url.search = new URL(req.originalUrl || req.url).search;
      const c = config();
      oidc.enableNonRepudiationChecks(c);
      const tokens = await oidc.authorizationCodeGrant(c,url,{expectedState:f.state,expectedNonce:f.nonce,pkceCodeVerifier:f.verifier,idTokenExpected:true});
      const claims = tokens.claims();
      if (!claims?.sub || claims.tid !== tenant) return reply(403);
      const subject = createHash('sha256').update(`${issuer}\n${claims.sub}`).digest('hex');
      const id = await resolveSubject(container().getBlockBlobClient(`email-logins/${subject}`), subject, f.link);
      const session = await seal(authCookie,{id,name:claims.preferred_username || claims.email || 'Email account'},86400);
      return reply(302,undefined,{headers:{...headers,Location:`${origin}/`},cookies:[cookie(flowCookie,'',0),cookie(authCookie,session,86400)]});
    }
    if (action === 'logout' && req.method === 'POST') return reply(200,{ok:true},{cookies:[cookie(authCookie,'',0),cookie(flowCookie,'',0)]});
    const session = await read(req,authCookie);
    if (action === 'me' && req.method === 'GET') return reply(200,{clientPrincipal:session?{userId:session.id,userDetails:session.name}:null});
    if (action === 'profile' && ['GET','PUT','DELETE'].includes(req.method)) {
      if (!session) return reply(401);
      const principal = {identityProvider:session.id.startsWith('email:')?'email':'aad',userId:session.id,userRoles:['authenticated']};
      const h = Object.fromEntries(Object.entries(req.headers).map(([k,v])=>[k.toLowerCase(),v]));
      h['x-ms-client-principal'] = Buffer.from(JSON.stringify(principal)).toString('base64');
      return profile.makeHandler(k=>container().getBlockBlobClient(k),validateState)({...req,headers:h});
    }
    return reply(404);
  } catch {
    return reply(400,'Stillwater could not complete email sign-in. No journal was replaced. Return to Stillwater and try again. An email sign-in already attached to another journal cannot be reassigned.');
  }
}
