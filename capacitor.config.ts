import type { CapacitorConfig } from '@capacitor/cli';

/* Empaquetage Android — APK AUTONOME.
 *
 * POURQUOI AUTONOME plutôt qu'une coquille qui ouvrirait le site déployé
 * (« TWA »). Habitum promet que rien ne sort de l'appareil et qu'aucun compte
 * n'est requis. Un paquet qui aurait besoin de joindre Vercel pour démarrer
 * contredirait cette promesse à moitié — et il serait soudé à une adresse
 * `.vercel.app` que le jour d'un vrai nom de domaine rendrait caduque, sans
 * recours pour les APK déjà installés.
 *
 * Ici, l'application ENTIÈRE est dans le fichier : aucun serveur, aucun
 * domaine, aucun `assetlinks.json`. Elle démarre sans réseau, du premier
 * lancement au millième. C'est aussi ce qui la rend éligible à F-Droid sans
 * l'anti-feature « dépend d'un service réseau ».
 *
 * `webDir` pointe sur la sortie de `scripts/empaqueter.mjs`, et non sur `out/`
 * directement : le paquet ne doit contenir NI l'archive du prototype — 773 Ko
 * qui chargent React depuis unpkg.com, donc morts hors ligne — NI la galerie
 * `/dev`, NI la vitrine, qui n'a aucun sens dans une application installée.
 *
 * `appId` ne se change JAMAIS après la première publication : pour Android,
 * un identifiant différent est une autre application, sans mise à jour
 * possible par-dessus la précédente. */
const config: CapacitorConfig = {
  appId: 'app.habitum',
  appName: 'Habitum',
  webDir: 'packaging/www',

  android: {
    /* Le projet natif vit sous `packaging/`, et non à la racine comme le veut
       la convention de Capacitor : la racine de ce dépôt appartient à
       l'application web, et un dossier `android/` de 5 Mo y laisserait croire
       à un projet mobile alors que c'est un ARTEFACT D'EMPAQUETAGE. */
    path: 'packaging/android',

    /* Le fond du WebView pendant le tout premier rendu. Sans lui, Android
       peint du BLANC avant que la page arrive — un éclair aveuglant à chaque
       ouverture d'une application dont les trois thèmes sont sombres ou clairs
       mais jamais blancs. C'est `--bg` du thème `neural`, celui par défaut. */
    backgroundColor: '#04060d',
  },

  server: {
    /* `androidScheme: 'https'` est le défaut de Capacitor 8 et il compte :
       l'origine devient `https://localhost`, donc une origine SÛRE. IndexedDB,
       les service workers et le stockage persistant y sont autorisés ; sous
       `http://` Android les restreint, et la base de l'application — tout le
       produit — ne survivrait pas. */
    androidScheme: 'https',

    /* DÉMARRER DIRECTEMENT SUR L'APPLICATION, et sur un chemin qui contient un
       POINT. Les deux comptent.
       Capacitor ouvre `/` par défaut, donc la page d'entrée du paquet, qui ne
       fait que rediriger : un aller-retour visible au lancement. Et surtout,
       son serveur d'assets sert le `index.html` DE LA RACINE pour tout chemin
       dont le dernier segment n'a pas d'extension — viser `app/` reviendrait
       donc à redemander cette page d'entrée, indéfiniment. C'est exactement ce
       qui a produit un écran noir à la première installation. */
    /* LA BARRE OBLIQUE INITIALE EST OBLIGATOIRE. `Bridge.java` concatène
       BRUTALEMENT — `appUrl += appUrlPath` — et n'ajoute « / » que pour les
       schémas autres que `http`/`https`. Sans elle, l'URL de départ devenait
       `https://localhostapp/index.html` : un nom d'hôte inexistant, et un
       `ERR_NAME_NOT_RESOLVED` à l'ouverture. */
    appStartPath: '/app/index.html',
  },
};

export default config;
