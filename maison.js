/* Notre Maison — éléments communs aux deux espaces (v1)
   Pour l'instant : barre de navigation entre « Mon Budget » et « Mon Quotidien ».
   Les données de chaque espace restent dans leur propre clé de stockage (budget.v3, quotidien.v1). */
(function () {
 var esp = document.documentElement.getAttribute('data-espace') || '';
 var css = '#maison-bar{position:sticky;top:0;z-index:40;display:flex;align-items:center;gap:4px;min-height:36px;padding:0 12px;background:color-mix(in srgb,var(--surface,#fff) 88%,transparent);-webkit-backdrop-filter:blur(14px);backdrop-filter:blur(14px);border-bottom:1px solid var(--bord,#e8d8c3);font-size:12.5px;line-height:1}'
  + '#maison-bar a{text-decoration:none;display:inline-flex;align-items:center;min-height:30px;padding:0 12px;border-radius:99px;font-weight:600;color:var(--muted,#6b4a52)}'
  + '#maison-bar a:hover{background:var(--surface2,#f6ead9)}#maison-bar a.on{background:var(--acc-soft,#fbe3e1);color:var(--acc,#9b1b3c)}'
  + '#maison-bar .mm-logo{padding:0;min-height:30px;background:none!important}#maison-bar .mm-logo img{width:26px;height:26px;display:block;border-radius:7px}#maison-bar .mm-sp{flex:1}'
  + '#maison-bar a:focus-visible{outline:3px solid var(--acc,#9b1b3c);outline-offset:1px}'
  + '.top{top:36px!important}@media(min-width:901px){aside{top:36px!important;height:calc(100vh - 36px)!important}}'
  + '@media(max-width:480px){#maison-bar{padding:0 8px}#maison-bar a{padding:0 10px}}';
 function lien(cle, nom, href) {
  return '<a href="' + href + '" class="' + (esp === cle ? 'on' : '') + '"' + (esp === cle ? ' aria-current="page"' : '') + '>' + nom + '</a>';
 }
 function monter() {
  var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
  var b = document.createElement('nav'); b.id = 'maison-bar'; b.setAttribute('aria-label', 'Notre Maison');
  b.innerHTML = '<a class="mm-logo" href="notre-maison.html" title="Notre Maison : accueil" aria-label="Notre Maison, accueil"><img src="icone.png" alt=""></a><span class="mm-sp"></span>'
   + lien('budget', 'Mon Budget', 'budget.html#bord') + lien('quotidien', 'Mon Quotidien', 'quotidien.html#accueil');
  document.body.insertBefore(b, document.body.firstChild);
 }
 if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', monter); else monter();
})();

/* ---------- Notre Maison : sauvegarde globale et reprise des données (v1) ----------
   Aucun serveur : tout se passe dans le navigateur. Les clés des deux espaces ne changent pas. */
window.Maison = (function () {
 var K = { budget: 'budget.v3', quotidien: 'quotidien.v1' }, ECH = 'maison.echanges.v1', ACC = 'maison.accuses.v1', COPIE = '.avant-reprise', SAUV = 'maison.sauv', META = 'maison.reprise';
 var NOMS = { budget: 'Mon Budget', quotidien: 'Mon Quotidien' };
 function lire(k) { try { var x = localStorage.getItem(k); return x ? JSON.parse(x) : null; } catch (e) { return null; } }
 function nb(x) { return Array.isArray(x) ? x.length : 0; }
 function obj(x) { return x && typeof x === 'object' && !Array.isArray(x); }
 function compte(esp, d) {
  if (!obj(d)) return null;
  if (esp === 'budget') return [['Opérations', nb(d.txs)], ['Relevés', nb(d.releves)], ['Revenus et dépenses prévus', nb(d.recurrences)], ['Projets', nb(d.projets)], ['Règles de classement', nb(d.regles)]];
  return [['Tâches', nb(d.taches)], ['Articles sur la liste', nb(d.courses)], ['Sessions de courses', nb(d.achats)], ['Articles mémorisés', obj(d.catalogue) ? Object.keys(d.catalogue).length : 0]];
 }
 function cmp(a, b) { return JSON.stringify(a) === JSON.stringify(b); }
 function dateDe(d) { return d.sauvLe || d.exporteLe || d.sauv || ''; }
 /* Contrôle d'un contenu pour un espace : renvoie { data } nettoyé, ou { err }, avec d'éventuels avertissements */
 function verifier(esp, d, nom) {
  var W = [];
  if (!obj(d)) return { err: 'Le contenu pour ' + NOMS[esp] + ' est illisible.' };
  if (esp === 'budget') {
   if (d.format !== undefined && d.format !== 'budget-sauvegarde-v1') return { err: 'Ce n\'est pas une sauvegarde de Mon Budget.' };
   if (d.source === 'notre-quotidien') return { err: 'Ce fichier est un fichier d\'échange « vers budget » : il s\'importe dans Mon Budget (Réglages → Sauvegarde, « Fusionner »), pas ici.' };
   if (Number(d.version) > 1) return { err: 'Cette sauvegarde vient d\'une version plus récente de Mon Budget.' };
   if (!Array.isArray(d.txs)) return { err: 'La liste des opérations est absente ou illisible : le fichier est invalide ou incomplet.' };
   var bad = ['releves', 'recurrences', 'projets', 'regles'].filter(function (k) { return d[k] !== undefined && !Array.isArray(d[k]); });
   if (bad.length) return { err: 'Section(s) illisible(s) : ' + bad.join(', ') + '.' };
   if (d.mode === 'demo') return { err: 'Ce sont des données de démonstration : elles ne sont pas reprises.' };
   var c = JSON.parse(JSON.stringify(d));
   ['format', 'application', 'exporteLe', 'contenu', 'version', 'source'].forEach(function (k) { delete c[k]; });
   return { data: c, W: W };
  }
  if (d.format !== undefined && d.format !== 'quotidien-sauvegarde-v1') return { err: 'Ce n\'est pas une sauvegarde de Mon Quotidien.' };
  if (Number(d.v) > 1) return { err: 'Cette sauvegarde vient d\'une version plus récente de Mon Quotidien.' };
  if (!Array.isArray(d.taches) || !Array.isArray(d.courses)) return { err: 'Les tâches ou la liste de courses sont absentes ou illisibles : le fichier est invalide ou incomplet.' };
  var q = JSON.parse(JSON.stringify(d)); delete q.format;
  return { data: q, W: W };
 }
 /* Lit un ou plusieurs fichiers et prépare le plan de reprise (rien n'est modifié) */
 function analyser(fichiers) {
  var P = { items: {}, erreurs: [], ignores: [] };
  var lectures = Array.prototype.map.call(fichiers, function (f) {
   if (f.size > 60e6) { P.erreurs.push('« ' + f.name + ' » est trop volumineux pour être une sauvegarde.'); return Promise.resolve(); }
   return f.text().then(function (txt) {
    var d; try { d = JSON.parse(txt); } catch (e) { P.erreurs.push('« ' + f.name + ' » n\'est pas un fichier JSON lisible (vide, tronqué ou d\'un autre type).'); return; }
    var parts = [];
    if (obj(d) && d.format === 'notre-maison-sauvegarde-v1') {
     if (Number(d.version) > 1) { P.erreurs.push('« ' + f.name + ' » vient d\'une version plus récente de Notre Maison.'); return; }
     if (d.budget) parts.push(['budget', d.budget]); if (d.quotidien) parts.push(['quotidien', d.quotidien]);
     if (!parts.length) { P.erreurs.push('« ' + f.name + ' » ne contient aucune donnée.'); return; }
    } else if (obj(d) && (d.format === 'budget-sauvegarde-v1' || (d.format === undefined && Array.isArray(d.txs)))) parts.push(['budget', d]);
    else if (obj(d) && (d.format === 'quotidien-sauvegarde-v1' || (d.format === undefined && Array.isArray(d.taches)))) parts.push(['quotidien', d]);
    else { P.erreurs.push('« ' + f.name + ' » n\'est pas une sauvegarde reconnue (Notre Maison, Mon Budget ou Mon Quotidien).'); return; }
    parts.forEach(function (p) {
     var esp = p[0], R = verifier(esp, p[1]);
     if (R.err) { P.erreurs.push(NOMS[esp] + ' — « ' + f.name + ' » : ' + R.err); return; }
     var it = { esp: esp, nom: f.name, date: dateDe(p[1]), data: R.data }, ex = P.items[esp];
     if (ex && ex.date >= it.date) { P.ignores.push('« ' + f.name + ' » (' + NOMS[esp] + ') : un fichier plus récent est déjà retenu.'); return; }
     if (ex) P.ignores.push('« ' + ex.nom + ' » (' + NOMS[esp] + ') : remplacé par un fichier plus récent.');
     P.items[esp] = it;
    });
   }).catch(function () { P.erreurs.push('« ' + f.name + ' » n\'a pas pu être lu.'); });
  });
  return Promise.all(lectures).then(function () {
   Object.keys(P.items).forEach(function (esp) {
    var it = P.items[esp], cur = lire(K[esp]);
    it.actuel = compte(esp, cur); it.fichier = compte(esp, it.data); it.identique = !!cur && cmp(cur, it.data);
   });
   return P;
  });
 }
 /* Remplace les données des espaces demandés, avec copie de secours et vérification ; annule tout en cas d'échec */
 function appliquer(P, liste) {
  var avant = {}, ecrits = [], meta = { le: new Date().toISOString(), esp: liste, avait: {} };
  function retour() { ecrits.forEach(function (e) { try { if (avant[e] === null) localStorage.removeItem(K[e]); else localStorage.setItem(K[e], avant[e]); } catch (x) {} }); }
  try {
   liste.forEach(function (e) { avant[e] = localStorage.getItem(K[e]); meta.avait[e] = avant[e] !== null; if (avant[e] !== null) localStorage.setItem(K[e] + COPIE, avant[e]); });
   localStorage.setItem(META, JSON.stringify(meta));
   /* échanges dérivés : ils sont recréés automatiquement à partir des données reprises */
   if (liste.indexOf('budget') >= 0) localStorage.removeItem(ACC);
   if (liste.indexOf('quotidien') >= 0) localStorage.removeItem(ECH);
  } catch (x) { return { ok: false, msg: 'Reprise impossible : l\'espace de stockage du navigateur ne permet pas de garder une copie de secours. Vos données n\'ont pas été modifiées.' }; }
  try {
   liste.forEach(function (e) {
    var d = JSON.parse(JSON.stringify(P.items[e].data)), cur = avant[e] ? JSON.parse(avant[e]) : null;
    if (e === 'budget' && cur && cur.sync && d.sync) d.sync.appareil = cur.sync.appareil;
    ecrits.push(e); localStorage.setItem(K[e], JSON.stringify(d));
    var re = lire(K[e]);
    if (!re || !cmp(compte(e, re), compte(e, d))) throw new Error('verif');
   });
  } catch (x) { retour(); return { ok: false, msg: 'Reprise annulée : les nouvelles données n\'ont pas pu être enregistrées ou vérifiées. Vos données d\'avant sont intactes.' }; }
  return { ok: true };
 }
 function derniereReprise() { var m = lire(META); return m && m.esp && m.esp.every(function (e) { try { return !m.avait[e] || !!localStorage.getItem(K[e] + COPIE); } catch (x) { return false; } }) ? m : null; }
 function annuler() {
  var m = derniereReprise(); if (!m) return { ok: false, msg: 'Aucune reprise à annuler.' };
  try {
   m.esp.forEach(function (e) { if (m.avait[e]) localStorage.setItem(K[e], localStorage.getItem(K[e] + COPIE)); else localStorage.removeItem(K[e]); });
   localStorage.removeItem(META);
  } catch (x) { return { ok: false, msg: 'Annulation impossible.' }; }
  return { ok: true, esp: m.esp };
 }
 /* Sauvegarde globale : un seul fichier avec les deux espaces (les données de démonstration en sont exclues) */
 function telecharger(nom, objet) {
  var f = new File([JSON.stringify(objet, null, 1)], nom, { type: 'application/json' });
  return (navigator.canShare && navigator.canShare({ files: [f] }) && /iPhone|iPad|Android/i.test(navigator.userAgent) ? navigator.share({ files: [f], title: nom }).then(function () { return true; }) : Promise.resolve(false))
   .catch(function (e) { if (e && e.name === 'AbortError') return 'annule'; return false; })
   .then(function (r) {
    if (r === 'annule') return false; if (r === true) return true;
    var a = document.createElement('a'); a.href = URL.createObjectURL(f); a.download = nom; document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000); return true;
   });
 }
 function exporterTout() {
  var b = lire(K.budget), q = lire(K.quotidien); if (b && b.mode === 'demo') b = null;
  if (!b && !q) return Promise.resolve({ ok: false, msg: 'Il n\'y a encore aucune donnée à sauvegarder.' });
  var d = { format: 'notre-maison-sauvegarde-v1', version: 1, application: 'Notre Maison', exporteLe: new Date().toISOString(),
   contenu: { budget: b ? compte('budget', b) : null, quotidien: q ? compte('quotidien', q) : null }, budget: b, quotidien: q };
  var nom = 'notre-maison-sauvegarde-' + new Date().toLocaleDateString('sv-SE') + '.json';
  return telecharger(nom, d).then(function (ok) {
   if (!ok) return { ok: false, msg: 'Sauvegarde annulée ou impossible : aucun fichier créé.' };
   try { localStorage.setItem(SAUV, new Date().toISOString()); } catch (e) {}
   return { ok: true, nom: nom, budget: !!b, quotidien: !!q };
  });
 }
 function derniereSauvegarde() { try { return localStorage.getItem(SAUV) || ''; } catch (e) { return ''; } }

 /* Boîte d'échange : Mon Quotidien dépose (clé ECH, seul à l'écrire), Mon Budget accuse réception (clé ACC, seul à l'écrire).
    Chaque élément a une référence unique « quotidien:achat:<id> » ou « quotidien:tache:<id> » ; « rev » change quand son contenu change. */
 function stab(o) { return JSON.stringify(o, function (k, v) { if (v && typeof v === 'object' && !Array.isArray(v)) { var r = {}; Object.keys(v).sort().forEach(function (x) { r[x] = v[x]; }); return r; } return v; }); }
 function hash(o) { var t = stab(o) || '', a = 0xdeadbeef, b = 0x41c6ce57; for (var i = 0; i < t.length; i++) { var c = t.charCodeAt(i); a = Math.imul(a ^ c, 2654435761); b = Math.imul(b ^ c, 1597334677); }
  a = Math.imul(a ^ (a >>> 16), 2246822507) ^ Math.imul(b ^ (b >>> 13), 3266489909); b = Math.imul(b ^ (b >>> 16), 2246822507) ^ Math.imul(a ^ (a >>> 13), 3266489909); return (4294967296 * (2097151 & b) + (a >>> 0)).toString(36); }
 var echange = {
  ref: function (type, id) { return 'quotidien:' + type + ':' + id; },
  entrees: function () { var e = lire(ECH); return e && obj(e.entrees) ? e.entrees : {}; },
  accuses: function () { var a = lire(ACC); return a && obj(a.accuses) ? a.accuses : {}; },
  /* dépose (ou met à jour) un élément ; ne fait rien si son contenu n'a pas changé */
  deposer: function (type, id, donnees) {
   var ref = echange.ref(type === 'depense' ? 'achat' : 'tache', id), E = lire(ECH) || { v: 1, entrees: {} }; if (!obj(E.entrees)) E.entrees = {};
   var rev = hash(donnees); if (E.entrees[ref] && E.entrees[ref].rev === rev) return { ref: ref, rev: rev, change: false };
   E.entrees[ref] = { ref: ref, type: type, rev: rev, donnees: donnees, deposeLe: new Date().toISOString() };
   try { localStorage.setItem(ECH, JSON.stringify(E)); } catch (e) { return { ref: ref, rev: rev, change: false, erreur: true }; }
   return { ref: ref, rev: rev, change: true };
  }
 };
 return { K: K, ECH: ECH, ACC: ACC, hash: hash, echange: echange, NOMS: NOMS, lire: lire, compte: compte, analyser: analyser, appliquer: appliquer, annuler: annuler, derniereReprise: derniereReprise, exporterTout: exporterTout, derniereSauvegarde: derniereSauvegarde };
})();

/* Alerte si les données de l'espace ouvert sont modifiées dans un autre onglet (évite d'écraser des changements) */
(function () {
 var esp = document.documentElement.getAttribute('data-espace');
 if (!window.Maison || !Maison.K[esp]) return;
 addEventListener('storage', function (e) {
  if (e.key !== Maison.K[esp] || document.getElementById('maison-stale')) return;
  var d = document.createElement('div'); d.id = 'maison-stale'; d.setAttribute('role', 'alert');
  d.style.cssText = 'position:sticky;top:36px;z-index:39;background:var(--warn-soft,#fff3df);color:var(--warn,#b45309);padding:8px 14px;font-weight:600;font-size:13px;border-bottom:1px solid var(--bord,#e8d8c3)';
  d.innerHTML = 'Ces données ont été modifiées dans un autre onglet ou une reprise de données. Actualisez la page pour éviter d\'écraser ces changements. <button onclick="location.reload()" style="margin-left:8px;padding:3px 12px;border-radius:8px;border:1px solid currentColor;background:none;color:inherit;font:inherit;cursor:pointer">Actualiser</button>';
  var bar = document.getElementById('maison-bar'); if (bar) bar.after(d); else document.body.insertBefore(d, document.body.firstChild);
 });
})();

/* ---------- Notre Maison : visite guidée de toute l'application ----------
   Une seule visite pour les trois pages (accueil, Mon Budget, Mon Quotidien). Son avancement est gardé dans « maison.visite » :
   quand une étape se trouve sur une autre page, on y va et la visite continue toute seule. */
(function () {
 var KEY = 'maison.visite', VUE = 'maison.visite.vue';
 var PAGES = { maison: 'notre-maison.html', budget: 'budget.html', quotidien: 'quotidien.html' };
 var NOMP = { maison: 'la page d\'accueil Notre Maison', budget: 'Mon Budget', quotidien: 'Mon Quotidien' };
 var f = (location.pathname.split('/').pop() || '').toLowerCase();
 var page = f.indexOf('budget') === 0 ? 'budget' : f.indexOf('quotidien') === 0 ? 'quotidien' : 'maison';
 var S = [
  { p: 'maison', t: 'Bienvenue dans Notre Maison', x: 'Deux espaces reliés : <b>Mon Budget</b> (vos finances) et <b>Mon Quotidien</b> (tâches et courses de la maison). Cette visite dure environ 3 minutes et vous les présente tour à tour. Vous pouvez la quitter à tout moment.' },
  { p: 'maison', t: 'Vos données restent chez vous', x: 'Tout est d\'abord enregistré dans votre navigateur. Si vous activez la synchronisation (bouton ☁ de la barre), vos données sont aussi recopiées dans votre espace privé Supabase, protégé par votre connexion, pour retrouver les mêmes informations sur tous vos appareils. Les deux espaces s\'échangent ensuite des informations automatiquement.' },
  { p: 'maison', t: 'Passer d\'un espace à l\'autre', x: 'La barre du haut, présente sur toutes les pages, bascule entre Mon Budget et Mon Quotidien. Le bouton <b>« Visite guidée »</b> à côté relance cette visite quand vous voulez.' },
  { p: 'budget', o: 'bord', t: 'Mon Budget : le tableau de bord', x: 'Ce que vous pouvez encore dépenser ce mois-ci, le solde prévu et les alertes à traiter en priorité. Le bandeau jaune indique que vous voyez encore des données fictives de démonstration.' },
  { p: 'budget', o: 'imp', t: 'Importez vos relevés bancaires', x: 'C\'est le point de départ : importez le fichier de votre banque (CSV ou Excel), les opérations sont classées automatiquement. Tant que rien n\'est importé, Mon Budget reste en démonstration et ne reçoit rien de Mon Quotidien.' },
  { p: 'budget', o: 'verif', t: 'Vérifiez vos opérations', x: 'Rien n\'est classé sans votre accord. L\'application retient vos choix pour classer seule les prochaines opérations du même commerçant.' },
  { p: 'budget', o: 'dep', t: 'Charges et revenus prévus', x: 'Salaire, loyer, abonnements… Ces échéances régulières servent de base à toutes les prévisions.' },
  { p: 'budget', o: 'prev', t: 'Anticipez les mois à venir', x: 'L\'évolution prévue de votre compte, mois par mois, selon trois scénarios. Le calendrier détaille ensuite jour par jour.' },
  { p: 'budget', o: 'sim', t: 'Le simulateur d\'achat', x: 'Il compare plusieurs dates et recommande la meilleure pour acheter sans passer sous votre seuil de sécurité. Vous pouvez retenir la date proposée ou en forcer une autre.' },
  { p: 'budget', o: 'proj', t: 'Les projets', x: 'Vos achats à venir. Ceux qui viennent d\'une tâche de Mon Quotidien arrivent ici automatiquement ; le bouton « Tester » les envoie au simulateur.' },
  { p: 'budget', o: 'alertes', t: 'Les alertes', x: 'Solde faible, risque de découvert, charge à venir, budget dépassé… Chaque alerte explique la situation et propose une action.' },
  { p: 'budget', o: 'param', t: 'Réglages, échanges et sauvegarde', x: 'Seuil de sécurité, catégories, journal des modifications, sauvegarde. La section « Échanges avec Mon Quotidien » montre ce qui a été reçu de l\'autre espace.' },
  { p: 'quotidien', o: 'accueil', t: 'Mon Quotidien : l\'accueil', x: 'Ce qui compte aujourd\'hui : les tâches du jour et en retard, les prochaines échéances, et l\'ajout rapide d\'une tâche ou d\'un article de courses.' },
  { p: 'quotidien', o: 'taches', t: 'Les tâches', x: 'Pour l\'un, pour l\'autre ou pour les deux, avec échéance, priorité et répétition (chaque semaine, chaque mois…). Les filtres font ressortir ce qui est urgent.' },
  { p: 'quotidien', o: 'taches', t: 'Une tâche qui coûte de l\'argent', x: 'Dans la fiche d\'une tâche, cochez <b>« Cette tâche coûte de l\'argent »</b> et indiquez le montant estimé. Le projet est créé dans Mon Budget : vous simulez l\'achat pour choisir la meilleure date, et la date retenue revient dans la tâche.' },
  { p: 'quotidien', o: 'courses', t: 'La liste de courses', x: 'Ajoutez vos articles (rangés par rayon), cochez-les en magasin, puis terminez les courses en indiquant le montant payé et qui a payé. Chaque session est gardée dans l\'historique.' },
  { p: 'quotidien', o: 'courses', t: 'Les courses arrivent dans le budget', x: 'Dès qu\'une session est terminée, la dépense part toute seule dans Mon Budget, déjà validée. Si elle correspond à une ligne de votre relevé bancaire, les deux sont fusionnées : aucun double comptage.' },
  { p: 'quotidien', o: 'reglages', t: 'Réglages de Mon Quotidien', x: 'Prénoms du foyer, catégories, rayons, pense-bête et sauvegarde de cet espace.' },
  { p: 'maison', t: 'La sauvegarde globale', x: 'Sur cette page, la sauvegarde globale enregistre <b>les deux espaces d\'un coup</b> et permet de les restaurer. Pensez-y régulièrement.' },
  { p: 'maison', t: 'À vous de jouer', x: 'Pour démarrer : <b>1.</b> importez un relevé dans Mon Budget, <b>2.</b> ajoutez vos premières tâches et courses dans Mon Quotidien. Le bouton « Visite guidée » de la barre du haut relance cette visite à tout moment.' }
 ];
 var css = '#mvisite{position:fixed;left:50%;transform:translateX(-50%);bottom:14px;z-index:9999;width:min(560px,calc(100vw - 24px));box-sizing:border-box;padding:14px 16px;border-radius:16px;background:var(--surface,#fff);color:var(--txt,#2b0a14);border:1px solid var(--acc,#9b1b3c);box-shadow:0 12px 40px rgba(0,0,0,.28);font:14px/1.5 system-ui,-apple-system,"Segoe UI",sans-serif}'
  + '#mvisite b.mv-t{display:block;font-size:15.5px;margin-bottom:4px}#mvisite p{margin:0 0 10px}#mvisite .mv-p{display:flex;gap:3px;margin:0 0 10px}#mvisite .mv-p i{flex:1;height:4px;border-radius:2px;background:var(--bord,#e8d8c3)}#mvisite .mv-p i.on{background:var(--acc,#9b1b3c)}'
  + '#mvisite .mv-b{display:flex;gap:8px;flex-wrap:wrap;align-items:center}#mvisite button{font:inherit;font-weight:600;padding:8px 14px;border-radius:10px;border:1px solid var(--acc,#9b1b3c);background:var(--acc,#9b1b3c);color:#fff;cursor:pointer}'
  + '#mvisite button.g{background:none;color:var(--acc,#9b1b3c)}#mvisite .mv-n{margin-left:auto;font-size:12px;color:var(--muted,#6b4a52)}'
  + '#maison-bar .mm-visite{font:inherit;font-size:12.5px;font-weight:600;min-height:30px;padding:0 12px;border-radius:99px;border:1px solid var(--bord,#e8d8c3);background:none;color:var(--acc,#9b1b3c);cursor:pointer}#maison-bar .mm-visite:hover{background:var(--acc-soft,#fbe3e1)}'
  + '@media(max-width:900px){#mvisite{bottom:76px}}';
 function etat() { try { var v = JSON.parse(localStorage.getItem(KEY)); return v && typeof v.i === 'number' ? v.i : -1; } catch (e) { return -1; } }
 function poser(i) { try { if (i < 0) localStorage.removeItem(KEY); else localStorage.setItem(KEY, JSON.stringify({ i: i })); } catch (e) {} }
 function carte() { var c = document.getElementById('mvisite'); if (!c) { c = document.createElement('div'); c.id = 'mvisite'; c.setAttribute('role', 'dialog'); c.setAttribute('aria-label', 'Visite guidée'); document.body.appendChild(c); } return c; }
 function fin() { poser(-1); try { localStorage.setItem(VUE, '1'); } catch (e) {} var c = document.getElementById('mvisite'); if (c) c.remove(); }
 function allerEtape(i) {
  if (i < 0 || i >= S.length) { fin(); return; }
  poser(i);
  if (S[i].p !== page) { location.href = PAGES[S[i].p]; return; }
  afficher(i);
 }
 function afficher(i) {
  var st = S[i], c = carte(), der = i === S.length - 1;
  if (st.p !== page) { // visite en cours mais sur une autre page
   c.innerHTML = '<b class="mv-t">Visite guidée en cours</b><p>La prochaine étape se trouve dans ' + NOMP[st.p] + '.</p><div class="mv-b"><button id="mv-go">Continuer vers ' + NOMP[st.p] + '</button><button class="g" id="mv-q">Quitter la visite</button></div>';
   document.getElementById('mv-go').onclick = function () { location.href = PAGES[st.p]; };
   document.getElementById('mv-q').onclick = fin; return;
  }
  if (st.o && typeof aller === 'function') { try { aller(st.o); } catch (e) {} } // « aller » : navigation interne de la page (Mon Budget ou Mon Quotidien)
  var suiv = S[i + 1], libre = der ? 'Terminer' : (suiv && suiv.p !== page ? 'Aller à ' + (suiv.p === 'maison' ? 'l\'accueil' : NOMP[suiv.p]) + ' →' : 'Suivant');
  var pts = ''; for (var k = 0; k < S.length; k++) pts += '<i class="' + (k <= i ? 'on' : '') + '"></i>';
  c.innerHTML = '<b class="mv-t">' + st.t + '</b><p>' + st.x + '</p><div class="mv-p" aria-hidden="true">' + pts + '</div><div class="mv-b">' + (i > 0 ? '<button class="g" id="mv-pr">Précédent</button>' : '')
   + '<button id="mv-nx">' + libre + '</button>' + (der ? '' : '<button class="g" id="mv-q">Quitter</button>') + '<span class="mv-n">Étape ' + (i + 1) + ' sur ' + S.length + '</span></div>';
  var pr = document.getElementById('mv-pr'); if (pr) pr.onclick = function () { allerEtape(i - 1); };
  document.getElementById('mv-nx').onclick = function () { allerEtape(i + 1); };
  var q = document.getElementById('mv-q'); if (q) q.onclick = fin;
  document.getElementById('mv-nx').focus({ preventScroll: true });
 }
 function demarrer() { try { localStorage.setItem(VUE, '1'); } catch (e) {} allerEtape(0); }
 function monter() {
  var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
  var bar = document.getElementById('maison-bar');
  if (bar) { var b = document.createElement('button'); b.type = 'button'; b.className = 'mm-visite'; b.textContent = '? Visite guidée'; b.onclick = demarrer; bar.appendChild(b); }
  var i = etat(); if (i >= 0) setTimeout(function () { afficher(i); }, 350);
 }
 document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && etat() >= 0 && document.getElementById('mvisite')) fin(); });
 if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { setTimeout(monter, 0); }); else setTimeout(monter, 0);
 window.Maison.visite = { demarrer: demarrer, active: function () { return etat() >= 0; }, vue: function () { try { return localStorage.getItem(VUE) === '1'; } catch (e) { return false; } } };
})();

/* ---------- Synchronisation en ligne (Supabase) ----------
   Les données de chaque appareil restent d'abord dans le navigateur ; ce module les recopie dans la base du foyer (Supabase) et reprend celles des autres appareils.
   Un enregistrement par clé : budget.v3, quotidien.v1 et les deux boîtes d'échange. Contrôle de version pour ne jamais écraser en silence un changement fait ailleurs. */
(function () {
 var SK = 'maison.cloud.v1', KEYS = ['budget.v3', 'quotidien.v1', 'maison.echanges.v1', 'maison.accuses.v1'];
 var CFG = null, ST = chargerSt(), cache = {}, ecouteurs = [], enCours = false, sale = 0, relance = false;
 var etat = { statut: 'off', msg: '', choix: [], conflits: [], recharger: false };
 function chargerSt() { try { var s = JSON.parse(localStorage.getItem(SK)); if (s && typeof s === 'object') { s.vers = s.vers || {}; s.hash = s.hash || {}; return s; } } catch (e) {} return { sess: null, foyer: null, code: null, vers: {}, hash: {}, der: null }; }
 function ecrSt() { try { localStorage.setItem(SK, JSON.stringify(ST)); } catch (e) {} }
 function hs(s) { var h = 2166136261; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36) + ':' + s.length; }
 function lire(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
 function vide(k, s) {
  if (!s) return true; var o; try { o = JSON.parse(s); } catch (e) { return true; } if (!o || typeof o !== 'object') return true;
  if (k === 'budget.v3') return o.mode === 'demo' || !((o.txs && o.txs.length) || (o.projets && o.projets.length) || (o.recurrences && o.recurrences.length));
  if (k === 'quotidien.v1') return !['taches', 'achats', 'courses', 'penseBete'].some(function (f) { return o[f] && o[f].length; });
  return !Object.keys(o.entrees || o.accuses || {}).length;
 }
 function notifier() { ecouteurs.forEach(function (f) { try { f(etatPublic()); } catch (e) {} }); majBarre(); }
 function etatPublic() { return { actif: !!CFG, statut: etat.statut, msg: etat.msg, email: ST.sess ? ST.sess.email : '', foyer: ST.foyer, code: ST.code, der: ST.der, choix: etat.choix.slice(), conflits: etat.conflits.slice() }; }
 function statut(s, m) { etat.statut = s; etat.msg = m || ''; notifier(); }
 function api(chemin, o) {
  o = o || {}; var h = { apikey: CFG.key, 'Content-Type': 'application/json' };
  if (!o.anon && ST.sess) h.Authorization = 'Bearer ' + ST.sess.access_token; else if (!/^sb_/.test(CFG.key)) h.Authorization = 'Bearer ' + CFG.key; /* les clés « sb_publishable_ » ne sont pas des jetons JWT : elles passent uniquement dans « apikey » */ if (o.prefer) h.Prefer = o.prefer;
  return fetch(CFG.url.replace(/\/$/, '') + chemin, { method: o.method || 'GET', headers: h, body: o.body ? JSON.stringify(o.body) : undefined }).then(function (r) {
   return r.text().then(function (t) { var j = null; try { j = t ? JSON.parse(t) : null; } catch (e) {} return { ok: r.ok, status: r.status, json: j }; });
  });
 }
 function msgErr(r) { var j = r && r.json; return (j && (j.msg || j.error_description || j.message || j.error)) || ('erreur ' + (r && r.status)); }
 function setSess(j) { ST.sess = { access_token: j.access_token, refresh_token: j.refresh_token, exp: Date.now() + (j.expires_in || 3600) * 1000, email: (j.user && j.user.email) || (ST.sess && ST.sess.email) || '' }; if (etat.statut === 'deconnecte') etat.statut = 'ok'; ecrSt(); }
 function jeton() {
  if (!ST.sess) return Promise.resolve(false); if (ST.sess.exp - Date.now() > 60000) return Promise.resolve(true);
  return api('/auth/v1/token?grant_type=refresh_token', { method: 'POST', anon: true, body: { refresh_token: ST.sess.refresh_token } }).then(function (r) {
   if (r.ok && r.json && r.json.access_token) { setSess(r.json); return true; }
   if (r.status >= 400 && r.status < 500) { ST.sess = null; ecrSt(); statut('deconnecte', 'Session expirée : reconnectez-vous.'); } return false;
  });
 }
 function connexion(email, mdp) {
  if (!CFG) return Promise.resolve({ ok: false, msg: 'Synchronisation non configurée.' });
  return api('/auth/v1/token?grant_type=password', { method: 'POST', anon: true, body: { email: String(email).trim(), password: mdp } }).then(function (r) {
   if (!r.ok || !r.json || !r.json.access_token) return { ok: false, msg: /invalid|credentials/i.test(msgErr(r)) ? 'E-mail ou mot de passe incorrect (ou e-mail pas encore confirmé).' : msgErr(r) };
   setSess(r.json); return trouverFoyer().then(function () { demarrerCycles(); return synchroniser().then(function () { return { ok: true }; }); });
  }, function () { return { ok: false, msg: 'Pas de connexion Internet.' }; });
 }
 function inscription(email, mdp) {
  if (!CFG) return Promise.resolve({ ok: false, msg: 'Synchronisation non configurée.' });
  if (String(mdp).length < 8) return Promise.resolve({ ok: false, msg: 'Le mot de passe doit faire au moins 8 caractères.' });
  return api('/auth/v1/signup', { method: 'POST', anon: true, body: { email: String(email).trim(), password: mdp } }).then(function (r) {
   if (!r.ok) return { ok: false, msg: msgErr(r) };
   if (r.json && r.json.access_token) { setSess(r.json); return trouverFoyer().then(function () { demarrerCycles(); notifier(); return { ok: true, msg: 'Compte créé et connecté.' }; }); }
   return { ok: true, confirmer: true, msg: 'Compte créé. Ouvrez le mail de confirmation reçu, puis revenez vous connecter ici.' };
  }, function () { return { ok: false, msg: 'Pas de connexion Internet.' }; });
 }
 function deconnexion() { ST = { sess: null, foyer: null, code: null, vers: {}, hash: {}, der: null }; ecrSt(); etat.choix = []; etat.conflits = []; statut('deconnecte', ''); }
 function trouverFoyer() {
  return api('/rest/v1/rpc/mon_foyer', { method: 'POST', body: {} }).then(function (r) {
   if (r.ok && typeof r.json === 'string') { ST.foyer = r.json; return api('/rest/v1/foyers?id=eq.' + r.json + '&select=code').then(function (c) { if (c.ok && c.json && c.json[0]) ST.code = c.json[0].code; ecrSt(); }); }
   ST.foyer = null; ST.code = null; ecrSt();
  }).catch(function () {});
 }
 function creerFoyer() {
  return jeton().then(function () { return api('/rest/v1/rpc/creer_foyer', { method: 'POST', body: {} }); }).then(function (r) {
   if (!r.ok) return { ok: false, msg: msgErr(r) }; return trouverFoyer().then(function () { return synchroniser().then(function () { return { ok: true }; }); });
  }, function () { return { ok: false, msg: 'Pas de connexion Internet.' }; });
 }
 function rejoindre(code) {
  return jeton().then(function () { return api('/rest/v1/rpc/rejoindre_foyer', { method: 'POST', body: { p_code: String(code).trim() } }); }).then(function (r) {
   if (!r.ok) return { ok: false, msg: /introuvable|code/i.test(msgErr(r)) ? msgErr(r) : msgErr(r) }; return trouverFoyer().then(function () { return synchroniser().then(function () { return { ok: true }; }); });
  }, function () { return { ok: false, msg: 'Pas de connexion Internet.' }; });
 }
 function sauverConflit(k, cur) { try { if (cur) localStorage.setItem('maison.cloud.conflit.' + k, cur); } catch (e) {} }
 function tirer(k, cur) {
  return api('/rest/v1/maison_donnees?foyer_id=eq.' + ST.foyer + '&cle=eq.' + encodeURIComponent(k) + '&select=valeur,version').then(function (r) {
   if (!r.ok || !r.json || !r.json[0]) throw new Error('lecture ' + r.status);
   var s = JSON.stringify(r.json[0].valeur);
   if (cur && cur !== s && !vide(k, cur)) sauverConflit(k, cur);
   localStorage.setItem(k, s); cache[k] = s; ST.vers[k] = r.json[0].version; ST.hash[k] = hs(s); ecrSt(); etat.recharger = true;
  });
 }
 function pousser(k, str, ver) {
  var val; try { val = JSON.parse(str); } catch (e) { return Promise.resolve(); }
  var p = ver === 0 ? api('/rest/v1/maison_donnees?select=version', { method: 'POST', prefer: 'return=representation', body: { foyer_id: ST.foyer, cle: k, valeur: val, version: 1 } })
   : api('/rest/v1/maison_donnees?foyer_id=eq.' + ST.foyer + '&cle=eq.' + encodeURIComponent(k) + '&version=eq.' + ver + '&select=version', { method: 'PATCH', prefer: 'return=representation', body: { valeur: val, version: ver + 1, maj: new Date().toISOString() } });
  return p.then(function (r) {
   if (r.ok && Array.isArray(r.json) && r.json.length) { ST.vers[k] = r.json[0].version; ST.hash[k] = hs(str); ecrSt(); return; }
   if (r.status === 409 || (r.ok && Array.isArray(r.json) && !r.json.length)) { relance = true; return; } // modifié ailleurs entre-temps : le cycle suivant tranchera
   throw new Error('écriture ' + r.status + ' ' + msgErr(r));
  });
 }
 function traiterCle(k, dist) {
  var cur = lire(k), loc = cur && cur.length > 2 ? cur : null, rv = dist[k] ? dist[k].version : 0, kv = ST.vers[k] || 0, jamais = !(k in ST.vers);
  var mod = loc && hs(cur) !== ST.hash[k];
  if (jamais) {
   var v = !loc || vide(k, cur);
   if (!rv) { if (v) { ST.vers[k] = 0; ST.hash[k] = hs(cur || ''); ecrSt(); return Promise.resolve(); } return pousser(k, cur, 0); }
   if (v || k.indexOf('maison.') === 0) return tirer(k, cur);
   if (etat.choix.indexOf(k) < 0) etat.choix.push(k); return Promise.resolve();
  }
  if (rv > kv) { if (!mod) return tirer(k, cur); if (etat.conflits.indexOf(k) < 0) etat.conflits.push(k); return tirer(k, cur); }
  if (mod) return pousser(k, cur, kv);
  return Promise.resolve();
 }
 function synchroniser() {
  if (!CFG || !ST.sess || !ST.foyer) return Promise.resolve();
  if (enCours) { relance = true; return Promise.resolve(); } enCours = true; statut('sync');
  etat.choix = []; var chaine;
  return jeton().then(function (ok) {
   if (!ok) throw new Error('session');
   return api('/rest/v1/maison_donnees?foyer_id=eq.' + ST.foyer + '&select=cle,version');
  }).then(function (r) {
   if (!r.ok) throw new Error('lecture ' + r.status + ' ' + msgErr(r)); var dist = {}; (r.json || []).forEach(function (x) { dist[x.cle] = x; });
   chaine = Promise.resolve(); KEYS.forEach(function (k) { chaine = chaine.then(function () { return traiterCle(k, dist); }); }); return chaine;
  }).then(function () {
   ST.der = new Date().toISOString(); ecrSt(); enCours = false;
   if (etat.choix.length) statut('choix', 'Choix à faire'); else statut('ok', '');
   if (relance) { relance = false; setTimeout(synchroniser, 800); }
   if (etat.recharger) apresTirage();
  }).catch(function (e) {
   enCours = false; relance = false;
   if (e && e.message === 'session') { if (etat.statut !== 'deconnecte') statut('deconnecte', 'Reconnectez-vous.'); return; }
   statut(e instanceof TypeError || navigator.onLine === false ? 'hors' : 'erreur', e instanceof TypeError ? 'Pas de connexion Internet.' : String(e && e.message || e));
  });
 }
 function choisir(mode) {
  var cles = etat.choix.slice(); if (!cles.length || !CFG) return Promise.resolve();
  return api('/rest/v1/maison_donnees?foyer_id=eq.' + ST.foyer + '&select=cle,version').then(function (r) {
   var dist = {}; (r.json || []).forEach(function (x) { dist[x.cle] = x; }); var ch = Promise.resolve();
   cles.forEach(function (k) { ch = ch.then(function () {
    if (mode === 'cloud') return tirer(k, lire(k));
    var cur = lire(k); return pousser(k, cur, dist[k] ? dist[k].version : 0);
   }); });
   return ch;
  }).then(function () { etat.choix = []; return synchroniser(); }).catch(function (e) { statut('erreur', String(e && e.message || e)); });
 }
 function apresTirage() {
  var occupe = function () { var a = document.activeElement; return !!document.querySelector('dialog[open]') || (a && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName)); };
  var n = +(sessionStorage.getItem('maison.cloud.rl') || 0), t0 = +(sessionStorage.getItem('maison.cloud.rt') || 0);
  if (Date.now() - t0 > 30000) n = 0;
  var go = function () { if (n >= 3) return; try { sessionStorage.setItem('maison.cloud.rl', String(n + 1)); sessionStorage.setItem('maison.cloud.rt', String(Date.now())); } catch (e) {} location.reload(); };
  if (document.documentElement.getAttribute('data-espace') === 'accueil') { etat.recharger = false; notifier(); return; } // l'accueil se met à jour tout seul
  etat.recharger = false;
  var b = document.getElementById('mm-cloud-ban'); if (!b) { b = document.createElement('div'); b.id = 'mm-cloud-ban'; b.setAttribute('role', 'status'); b.style.cssText = 'position:fixed;left:50%;transform:translateX(-50%);top:54px;z-index:9998;max-width:92vw;padding:10px 16px;border-radius:12px;background:var(--acc,#9b1b3c);color:#fff;font:600 13.5px system-ui,sans-serif;box-shadow:0 8px 24px rgba(0,0,0,.3)'; document.body.appendChild(b); }
  b.innerHTML = 'Des données plus récentes viennent d\'un autre appareil. <button style="margin-left:8px;font:inherit;border-radius:8px;border:0;padding:4px 10px;cursor:pointer">Actualiser</button>'; b.querySelector('button').onclick = function () { n = 0; go(); };
  var essai = function () { if (!document.getElementById('mm-cloud-ban')) return; if (!occupe()) go(); else setTimeout(essai, 3000); }; setTimeout(essai, 1500);
 }
 function majBarre() {
  var bar = document.getElementById('maison-bar'); if (!bar || !CFG) return; var b = document.getElementById('mm-cloud');
  if (!b) { b = document.createElement('a'); b.id = 'mm-cloud'; b.href = 'notre-maison.html#cloud'; b.style.cssText = 'font:600 12.5px system-ui,sans-serif;text-decoration:none;padding:5px 10px;border-radius:99px;border:1px solid var(--bord,#e8d8c3);color:var(--acc,#9b1b3c);white-space:nowrap'; bar.appendChild(b); }
  var T = { deconnecte: '☁ Se connecter', sync: '☁ …', ok: '☁ À jour', hors: '☁ Hors ligne', erreur: '☁ ⚠ Erreur', choix: '☁ Choix à faire', off: '' }[etat.statut] || '☁';
  b.textContent = T; b.title = etat.msg || 'Synchronisation en ligne'; b.style.display = T ? '' : 'none';
 }
 function surveiller() { // détecte les enregistrements faits par les espaces, puis synchronise quand l'activité se calme
  KEYS.forEach(function (k) { var c = lire(k); if (c !== cache[k]) { cache[k] = c; if (c && ST.sess && hs(c) !== ST.hash[k]) sale = Date.now(); } });
  if (sale && Date.now() - sale > 2500) { sale = 0; synchroniser(); }
 }
 var demarre = false;
 function demarrerCycles() {
  if (demarre) return; demarre = true;
  KEYS.forEach(function (k) { cache[k] = lire(k); });
  setInterval(surveiller, 2000);
  setInterval(function () { if (!document.hidden && navigator.onLine !== false) synchroniser(); }, 45000);
  document.addEventListener('visibilitychange', function () { if (!document.hidden) synchroniser(); });
  addEventListener('online', synchroniser);
 }
 function init() {
  var s = document.createElement('script'); s.src = 'maison-config.js';
  s.onload = function () {
   var c = window.MAISON_CLOUD; if (!c || !/^https:\/\/.+/.test(c.url || '') || !c.key) { etat.statut = 'off'; notifier(); return; }
   CFG = c; statut(ST.sess ? 'sync' : 'deconnecte', '');
   if (ST.sess) jeton().then(function (ok) { if (!ok) return; return (ST.foyer ? Promise.resolve() : trouverFoyer()).then(function () { demarrerCycles(); return synchroniser(); }); });
  };
  s.onerror = function () { etat.statut = 'off'; notifier(); }; document.head.appendChild(s);
 }
 window.Maison.cloud = { etat: etatPublic, surChangement: function (f) { ecouteurs.push(f); }, connexion: connexion, inscription: inscription, deconnexion: deconnexion, creerFoyer: creerFoyer, rejoindre: rejoindre, synchroniser: synchroniser, choisir: choisir };
 if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { setTimeout(init, 50); }); else setTimeout(init, 50);
})();

/* ===== Apparence : choix du thème (propre à chaque appareil, clé « maison.theme », non synchronisée) ===== */
(function () {
 var LISTE = [
  { id: 'creme-bleu', nom: 'Crème et bleu-pétrole', d: 'Clair ou sombre selon l\u2019appareil, boutons bleu-pétrole.', c: ['#fbf3e8', '#fffdf9', '#1f6b82'] },
  { id: 'creme-bordeaux', nom: 'Crème et bordeaux (v16)', d: 'Clair ou sombre selon l\u2019appareil, boutons bordeaux.', c: ['#fbf3e8', '#fffdf9', '#9b1b3c'] },
  { id: 'ancien', nom: 'Ancien (bleu-violet)', d: 'Le fond bleu d\u2019origine, clair ou sombre selon l\u2019appareil.', c: ['#eef6ff', '#ffffff', '#4f46e5'] },
  { id: 'bx-noir', nom: 'Bordeaux et noir', d: 'Fond bordeaux, encadrés noirs, boutons crème.', c: ['#62011d', '#0c0c0d', '#f6e6c8'] },
  { id: 'bx-creme', nom: 'Bordeaux et crème', d: 'Fond bordeaux, encadrés crème, boutons noirs.', c: ['#62011d', '#fbf3e8', '#111111'] },
  { id: 'bx-sauge', nom: 'Bordeaux et vert sauge', d: 'Fond bordeaux, encadrés sauge, boutons anthracite.', c: ['#62011d', '#a9b99b', '#262b28'] },
  { id: 'bx-anthracite', nom: 'Bordeaux et anthracite', d: 'Fond bordeaux, encadrés gris anthracite, boutons sauge.', c: ['#62011d', '#3a3f42', '#a9b99b'] },
  { id: 'bx-mixte', nom: 'Bordeaux, mixte', d: 'Menu anthracite, encadrés vert sauge, boutons anthracite.', c: ['#62011d', '#a9b99b', '#2b2f31'] }
 ];
 var DEF = 'creme-bleu';
 function get() { try { var t = localStorage.getItem('maison.theme'); for (var i = 0; i < LISTE.length; i++) if (LISTE[i].id === t) return t; } catch (e) {} return DEF; }
 function appliquer(id) {
  document.documentElement.setAttribute('data-theme', id);
  var mt = document.querySelector('meta[name="theme-color"]');
  if (mt) mt.setAttribute('content', id.indexOf('bx-') === 0 ? '#62011d' : '#62011d');
 }
 function set(id) { try { localStorage.setItem('maison.theme', id); } catch (e) {} appliquer(id); remplir(); }
 function html() {
  var cur = get();
  return '<div class="mm-th" role="group" aria-label="Choix de l\u2019apparence">' + LISTE.map(function (t) {
   var on = t.id === cur;
   return '<button type="button" data-th="' + t.id + '" aria-pressed="' + on + '"><span class="sw"><i style="background:' + t.c[0] + '"></i><i style="background:' + t.c[1] + '"></i><i style="background:' + t.c[2] + '"></i></span><b>' + (on ? '<span class="ck">\u2713</span>' : '') + t.nom + '</b><small>' + t.d + '</small></button>';
  }).join('') + '</div>';
 }
 function remplir() {
  var z = document.querySelectorAll('[data-theme-slot]');
  for (var i = 0; i < z.length; i++) { z[i].innerHTML = html(); z[i].setAttribute('data-filled', '1'); }
 }
 document.addEventListener('click', function (e) {
  var b = e.target.closest && e.target.closest('[data-th]'); if (b) { e.preventDefault(); set(b.getAttribute('data-th')); }
 });
 window.addEventListener('storage', function (e) { if (e.key === 'maison.theme') { appliquer(get()); remplir(); } });
 function surveiller() {
  remplir();
  if (window.MutationObserver) new MutationObserver(function () {
   var z = document.querySelectorAll('[data-theme-slot]:not([data-filled])');
   for (var i = 0; i < z.length; i++) { z[i].innerHTML = html(); z[i].setAttribute('data-filled', '1'); }
  }).observe(document.body, { childList: true, subtree: true });
 }
 if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', surveiller); else surveiller();
 appliquer(get());
 window.Maison = window.Maison || {};
 window.Maison.theme = { liste: LISTE, get: get, set: set };
})();
