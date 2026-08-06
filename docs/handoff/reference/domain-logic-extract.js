/* ==========================================================================
 * Habitum — extrait du moteur métier  (source d'autorité pour le portage)
 * --------------------------------------------------------------------------
 * Copie EXACTE des fonctions telles qu'elles sont dans `Habitum.dc.html` au
 * 5 août 2026, après finalisation. Régénérer ce fichier à chaque modification
 * du moteur — un extrait périmé est pire que pas d'extrait. C'est arrivé une
 * fois : cette copie a porté pendant six lots un `focusMin_` qui fabriquait
 * les minutes par hachage, alors que l'application ne le faisait plus.
 *
 * Contexte attendu :
 *   this.state.ov      : { "<habitId>|YYYY-MM-DD": valeur }  — le journal réel
 *   this.state.habits  : définitions d'habitudes
 *   this.state.tasks   : tâches (champ `d` = date absolue)
 *   this.state.sessions: sessions de focus réellement enregistrées
 *   this.HB            : habitudes non archivées
 *
 * À PORTER FIDÈLEMENT — ce sont les règles du produit :
 *   tgt, sched_, val_, isDone_, streak_, best_, pct_, sumVal_, dayRatio_,
 *   focusMin_, les helpers de date (today, add, key, dow, dkey, tdate, toff,
 *   soff, dnum) et les calculs d'objectifs (objCalc, objWin, objElapsed,
 *   objDaysLeft).
 *   Les 62 valeurs de référence de `tests/golden.json` sont la spécification
 *   exécutable de ces fonctions : le portage doit les reproduire à l'identique.
 *
 * SEPT types d'objectif d'habitude sont reconnus par isDone_() :
 *   check · count · time · total · list · limit · exact.
 *   Toute liste blanche qui en oublie un fait disparaître des données
 *   silencieusement — c'est arrivé à l'import (4 habitudes sur 6 perdues).
 *
 * À NE PAS PORTER — spécifique au prototype :
 *   materialize()  historique du jeu de démonstration (drapeau `demo`) ;
 *   rnd()          hachage FNV-1a, n'existe que pour materialize() ;
 *   memo/logFp/dropKeys/bestCache/habFp/best(h)  le cache mémoire. En
 *                  production, le cache dérivé de la base indexée joue ce rôle.
 *                  Ce qu'il faut en retenir : les métriques dépendent (a) de la
 *                  définition de l'habitude et (b) de SON journal — jamais de
 *                  celui des autres. Voir `docs/adr/0004-cache-de-rendu.md`.
 *
 * Corrigé, ne pas réintroduire :
 *   focusMin_ agrège les sessions RÉELLES (il fabriquait des minutes par
 *   hachage) ; il n'existe plus de journal généré pour les jours sans note.
 * ==========================================================================*/

class HabitumDomain {

/* --- 1. Dates relatives, tâches datées, jeu de démonstration --- */
  dkey(off){ return this.key(this.add(this.today(),off)); }
  tdate(k){ return (k&&k.d)?this.dnum(k.d):this.add(this.today(),(k&&k.off)||0); }
  toff(k){ return Math.round((this.tdate(k)-this.today())/86400000); }
  soff(x){ return (x&&x.d)?Math.round((this.today()-this.dnum(x.d))/86400000):((x&&x.off)||0); }
  get TK(){ const c=this.memo(); if(c._tk) return c._tk; return (c._tk=this.state.tasks.map(k=>Object.assign({},k,{off:this.toff(k)}))); }
  /* one-time materialisation: the generated back-history becomes real logged data */
  materialize(){
    if(this.state.mat) return;
    const T=this.today(), ov=Object.assign({},this.state.ov||{});
    (this.state.habits||[]).forEach(h=>{
      for(let i=1;i<=this.NMAT;i++){
        const d=this.add(T,-i), k=h.id+'|'+this.key(d);
        if(ov[k]!==undefined) continue;
        if(!this.sched_(h,d)) continue;
        const r=this.rnd(h.id+this.key(d)), tg=this.tgt(h);
        ov[k]= r<(h.rate===undefined?0.7:h.rate) ? tg : Math.round(tg*r*0.5);
      }
    });
    this.setState({ov:ov,mat:1});
  }

  /* ---------- date + data helpers ---------- */

/* --- 2. Objectifs (cumul, jalons, réduction) --- */
  dnum(str){ if(!str) return null; const p=String(str).split('-'); const d=new Date(+p[0],+p[1]-1,+p[2]); d.setHours(0,0,0,0); return d; }
  objWin(o){ const st=this.dnum(o.start); if(!st) return 30; return Math.max(1,Math.min(400,Math.round((this.today()-st)/86400000)+1)); }
  objDaysLeft(o){ const du=this.dnum(o.due); if(!du) return null; return Math.round((du-this.today())/86400000); }
  objElapsed(o){ const st=this.dnum(o.start), du=this.dnum(o.due); if(!st||!du||du<=st) return .5;
    return Math.max(0,Math.min(1,(this.today()-st)/(du-st))); }
  objCalc(o){
    const L=this.state.lang, h=o.src?this.state.habits.filter(x=>x.id===o.src)[0]:null;
    let cur=0, tot=Math.max(1,o.target||1), unit=(o.unit&&o.unit[L])||'';
    if(o.kind==='milestones'){ const ms=o.ms||[]; cur=ms.filter(m=>m.done).length; tot=Math.max(1,ms.length); unit=''; }
    else if(o.kind==='reduce'){
      const win=o.win||90; let d=this.add(this.today(),-win+1);
      for(let i=0;i<win;i++){ if(h&&this.sched(h,d)&&d<=this.today()&&!this.isDone(h,d)) cur++; d=this.add(d,1); }
    } else { cur=h?this.sumVal(h,this.objWin(o)):(o.cur||0); }
    const pct=o.kind==='reduce'?Math.max(0,Math.min(100,Math.round(100*(1-cur/tot)))):Math.min(100,Math.round(cur/tot*100));
    return {cur:cur,tot:tot,pct:pct,unit:unit,habit:h};
  }

/* --- 3. Dates, cache du prototype, planification, métriques --- */
  today(){ const d=new Date(); d.setHours(0,0,0,0); return d; }
  add(d,n){ const x=new Date(d); x.setDate(x.getDate()+n); return x; }
  key(d){ return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); }
  dow(d){ return (d.getDay()+6)%7; }
  cur(){ return this.add(this.today(), this.state.day); }
  rnd(s){ let h=2166136261; for(let i=0;i<s.length;i++){ h^=s.charCodeAt(i); h=Math.imul(h,16777619); } return ((h>>>0)%100000)/100000; }
  /* ---------- B3 : invalidation fine du cache de rendu ----------
     Avant : le moindre changement (une case cochee) videait TOUT le cache et relançait le
     recalcul complet de toutes les metriques de toutes les habitudes.
     Maintenant : on ne jette que les entrees qui dependent reellement de ce qui a change.
     Interrupteur de repli : cfg.fastCache=false retablit l'invalidation globale.
     Les cles du cache portent un separateur '|' apres l'identifiant d'habitude, ce qui permet
     de retrouver a quelle habitude appartient une entree. */
  dropKeys(pred){ const c=this._mc; Object.keys(c).forEach(k=>{ if(pred(k)) delete c[k]; }); }
  /* empreinte du journal, par habitude — une seule passe sur les cles de `ov` */
  logFp(){
    const ov=this.state.ov||{};
    if(this._fpo===ov && this._fp) return this._fp;
    const out={};
    Object.keys(ov).forEach(k=>{
      const i=k.indexOf('|'); if(i<0) return;
      const id=k.slice(0,i), str=k.slice(i+1)+':'+ov[k];
      let h=out[id]===undefined?2166136261:out[id];
      for(let j=0;j<str.length;j++){ h^=str.charCodeAt(j); h=Math.imul(h,16777619); }
      out[id]=h>>>0;
    });
    this._fpo=ov; this._fp=out;
    return out;
  }
  memo(){
    const s=this.state, tk=this.key(this.today());
    if(!this._mc) this._mc={};
    const fine = !(s.cfg && s.cfg.fastCache===false);
    /* changement structurel : definitions d'habitudes, jour courant, langue → tout retomber */
    if(!fine || this._mh!==s.habits || this._mk!==tk || this._ml!==s.lang){
      this._mh=s.habits; this._mo=s.ov; this._mt=s.tasks; this._mq=s.occ; this._ms=s.sessions;
      this._ml=s.lang; this._mk=tk; this._mc={}; this._mfp=this.logFp();
      return this._mc;
    }
    if(this._mt!==s.tasks || this._mq!==s.occ){
      this._mt=s.tasks; this._mq=s.occ;
      delete this._mc._tk;
      this.dropKeys(k=>k.slice(0,2)==='dr');
    }
    /* les minutes de focus n'agregent que `sessions` (E1) : elles n'etaient pas invalidees */
    if(this._ms!==s.sessions){
      this._ms=s.sessions;
      this.dropKeys(k=>k.slice(0,2)==='fm');
    }
    if(this._mo!==s.ov){
      this._mo=s.ov;
      const prev=this._mfp, now=this.logFp();
      this._mfp=now;
      if(!prev){ this._mc={}; return this._mc; }
      const dirty={}; let n=0;
      Object.keys(now).forEach(id=>{ if(prev[id]!==now[id]){ dirty[id]=1; n++; } });
      Object.keys(prev).forEach(id=>{ if(now[id]===undefined && !dirty[id]){ dirty[id]=1; n++; } });
      if(n){
        this.dropKeys(k=>{
          const p=k.slice(0,2);
          if(p==='dr') return true;
          if(p==='vl'||p==='dn'||p==='st'||p==='bs'||p==='pc'||p==='sv'){
            const rest=k.slice(2), i=rest.indexOf('|');
            return i<0 ? true : !!dirty[rest.slice(0,i)];
          }
          return false;
        });
      }
    }
    return this._mc;
  }
  /* ---------- C6 : contrat des fonctions pures du domaine ----------
     Elles ne lisent que `this.state` et la date du jour ; elles n'ecrivent rien. Les variantes
     sans `_` sont les memes fonctions passees par le cache de rendu (voir memo()). */
  /** Objectif du jour pour une habitude. @param {object} h @returns {number} */
  tgt(h){ if(h.g.k==='list') return (h.sub||[]).length||1; if(h.g.k==='total') return h.g.step||1; return h.g.t||1; }
  sched(h,d){
    if(h.arch) return false;
    const c=this.memo(), ck='sc'+h.id+'|'+d.getTime();
    if(c[ck]!==undefined) return c[ck];
    return (c[ck]=this.sched_(h,d));
  }
  /** L'habitude est-elle planifiee ce jour-la ? @param {object} h @param {Date} d @returns {boolean} */
  sched_(h,d){
    const k=this.key(d);
    if(h.start && k<h.start) return false;
    if(h.end && k>h.end) return false;
    if(h.pause && h.pause.from && h.pause.to && k>=h.pause.from && k<=h.pause.to) return false;
    const m=h.mode||'dow';
    if(m==='every'){
      /* D16 - l'origine du cycle doit etre STABLE. 'today()-182' la faisait glisser d'un jour chaque jour : une habitude 'tous les 2 jours' sans date de debut changeait de jours planifies quotidiennement. Repli sur une epoque figee. */
      const b=new Date((h.start||'2020-01-01')+'T00:00:00');
      const diff=Math.round((d-b)/86400000);
      return diff>=0 && diff%Math.max(1,h.n||2)===0;
    }
    if(m==='week'||m==='month') return true;
    return (h.days||[]).indexOf(this.dow(d))>=0;
  }
  val(h,d){
    const c=this.memo(), ck='vl'+h.id+'|'+d.getTime();
    if(c[ck]!==undefined) return c[ck];
    return (c[ck]=this.val_(h,d));
  }
  /** Valeur journalisee (0 si rien n'a ete saisi). @param {object} h @param {Date} d @returns {number} */
  val_(h,d){
    const o=this.state.ov[h.id+'|'+this.key(d)];
    return o!==undefined ? o : 0;
  }
  isDone(h,d){
    const c=this.memo(), ck='dn'+h.id+'|'+d.getTime();
    if(c[ck]!==undefined) return c[ck];
    return (c[ck]=this.isDone_(h,d));
  }
  /** Objectif atteint ce jour-la, selon le type d'objectif. @param {object} h @param {Date} d @returns {boolean} */
  isDone_(h,d){
    const v=this.val(h,d), t=this.tgt(h), k=h.g.k;
    if(k==='limit'){ const o=this.state.ov[h.id+'|'+this.key(d)]; if(d>=this.today() && o===undefined) return false; return v<=t; }
    if(k==='exact') return v===t;
    if(k==='total') return v>0;
    return v>=t;
  }
  streak(h){ const c=this.memo(), ck='st'+h.id+'|'; if(c[ck]!==undefined) return c[ck]; return (c[ck]=this.streak_(h)); }
  /** Serie en cours, en jours planifies consecutifs. @param {object} h @returns {number} */
  streak_(h){
    let n=0, d=this.today();
    if(this.sched(h,d) && !this.isDone(h,d)) d=this.add(d,-1);
    for(let i=0;i<this.NSTREAK;i++){ if(this.sched(h,d)){ if(this.isDone(h,d)) n++; else break; } d=this.add(d,-1); }
    return n;
  }
  /* ---------- B1 : cache persistant du record, par habitude ----------
     best_() balaie 366 jours x N habitudes. Il etait recalcule des qu'une case etait cochee,
     meme sur une autre habitude. Le resultat est desormais conserve (et survit au rechargement)
     sous une signature = definition de l'habitude + empreinte de SON journal + jour courant.
     Signature differente → recalcul ; jamais de valeur perimee affichee. */
  /** Empreinte de la definition d'une habitude (tout ce dont depend son record). @param {object} h @returns {string} */
  habFp(h){
    return [h.mode||'dow',(h.days||[]).join(''),h.start||'',h.end||'',h.n||'',h.g&&h.g.k,this.tgt(h),
      h.arch?1:0,h.pause?((h.pause.from||'')+'>'+(h.pause.to||'')):''].join('~');
  }
  bestCache(){
    if(this._bc) return this._bc;
    this._bc={};
    try{ const p=JSON.parse(localStorage.getItem(this.LS_BEST)||'null'); if(p && typeof p==='object' && !Array.isArray(p)) this._bc=p; }catch(err){}
    return this._bc;
  }
  best(h){
    const c=this.memo(), ck='bs'+h.id+'|';
    if(c[ck]!==undefined) return c[ck];
    const bc=this.bestCache(), fp=this.logFp()[h.id];
    const sig=this.habFp(h)+'#'+(fp===undefined?'-':fp)+'#'+this.key(this.today());
    const hit=bc[h.id];
    if(hit && hit.sig===sig) return (c[ck]=hit.v);
    const v=this.best_(h);
    bc[h.id]={sig:sig,v:v}; this._bcd=true;
    return (c[ck]=v);
  }
  best_(h){
    let n=0,mx=0,d=this.add(this.today(),-this.NBEST);
    for(let i=0;i<=this.NBEST;i++){ if(this.sched(h,d)){ if(this.isDone(h,d)){n++; if(n>mx)mx=n;} else n=0; } d=this.add(d,1); }
    return Math.max(mx,this.streak(h));
  }
  pct(h,win){ const c=this.memo(), ck='pc'+h.id+'|'+win; if(c[ck]!==undefined) return c[ck]; return (c[ck]=this.pct_(h,win)); }
  /** Taux de reussite sur une fenetre glissante, en %. @param {object} h @param {number} win @returns {number} */
  pct_(h,win){
    let s=0,dn=0,d=this.add(this.today(),-win+1);
    for(let i=0;i<win;i++){ if(this.sched(h,d)&&d<=this.today()){ s++; if(this.isDone(h,d))dn++; } d=this.add(d,1); }
    return s? Math.round(dn/s*100):0;
  }
  sumVal(h,win){ const c=this.memo(), ck='sv'+h.id+'|'+win; if(c[ck]!==undefined) return c[ck]; return (c[ck]=this.sumVal_(h,win)); }
  /** Cumul des valeurs journalisees sur une fenetre glissante. @param {object} h @param {number} win @returns {number} */
  sumVal_(h,win){
    let s=0,d=this.add(this.today(),-win+1);
    for(let i=0;i<win;i++){ s+=this.val(h,d); d=this.add(d,1); }
    return s;
  }
  dayRatio(d){ const c=this.memo(), ck='dr'+d.getTime(); if(c[ck]!==undefined) return c[ck]; return (c[ck]=this.dayRatio_(d)); }
  /** Charge et avancement d'une journee. @param {Date} d @returns {{s:number,dn:number,r:number}} */
  dayRatio_(d){
    let s=0,dn=0;
    this.HB.forEach(h=>{ if(this.sched(h,d)){ s++; if(this.isDone(h,d))dn++; } });
    this.TK.forEach(t=>{ if(this.key(this.tdate(t))===this.key(d)){ s++; if(t.done)dn++; } });
    return {s,dn,r:s?dn/s:0};
  }
  focusMin(win){ const c=this.memo(), ck='fm'+win; if(c[ck]!==undefined) return c[ck]; return (c[ck]=this.focusMin_(win)); }
  /* E1 - agrege les sessions REELLEMENT enregistrees.
     Avant : les minutes de focus etaient fabriquees par hachage (rnd('f'+date)) et affichees
     comme des donnees reelles. Un compte sans session affiche desormais 0. */
  focusMin_(win){
    let m=0;
    (this.state.sessions||[]).forEach(x=>{ const o=this.soff(x); if(o>=0 && o<win) m+=(+x.min||0); });
    return m;
  }
}
