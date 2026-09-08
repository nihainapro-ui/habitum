package app.habitum;

import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.provider.Settings;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Ouvre l'écran de réglages système d'Habitum.
 *
 * POURQUOI CE PLUGIN EXISTE, en une phrase : quand Android a mémorisé un refus
 * de notifications, il ne réaffiche plus JAMAIS de boîte de dialogue — et le
 * seul endroit qui défait ce refus est un écran système que l'application ne
 * peut pas atteindre autrement. Dire à l'utilisateur « allez dans les réglages
 * d'Android » sans l'y emmener, c'est lui demander de chercher dans une
 * arborescence qui change à chaque surcouche constructeur.
 *
 * Le plugin officiel `@capacitor/local-notifications` ne l'expose pas : il sait
 * ouvrir l'écran des ALARMES EXACTES (`changeExactNotificationSetting`), pas
 * celui des notifications. D'où ces trente lignes, et pas une de plus.
 *
 * REPLI VOLONTAIRE : certaines surcouches ne connaissent pas
 * ACTION_APP_NOTIFICATION_SETTINGS. On retombe alors sur la fiche de
 * l'application, d'où les notifications restent atteignables en un geste. Ne
 * rien ouvrir serait le pire des trois cas.
 */
@CapacitorPlugin(name = "ReglagesSysteme")
public class ReglagesSystemePlugin extends Plugin {

    @PluginMethod
    public void ouvrirNotifications(PluginCall call) {
        Context contexte = getContext();
        String paquet = contexte.getPackageName();

        Intent notifications = new Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS);
        notifications.putExtra(Settings.EXTRA_APP_PACKAGE, paquet);
        notifications.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);

        try {
            contexte.startActivity(notifications);
            call.resolve();
            return;
        } catch (Exception ignore) {
            // Surcouche sans cet écran : on tente la fiche de l'application.
        }

        try {
            Intent fiche = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
            fiche.setData(Uri.parse("package:" + paquet));
            fiche.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            contexte.startActivity(fiche);
            call.resolve();
        } catch (Exception e) {
            /* On REJETTE plutôt que de résoudre en silence : l'écran doit
               pouvoir dire que rien ne s'est ouvert, sinon l'utilisateur
               attend un réglage qui n'est jamais apparu. */
            call.reject("Aucun écran de réglages n'a pu être ouvert.", e);
        }
    }
}
