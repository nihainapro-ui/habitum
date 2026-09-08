package app.habitum;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        /* AVANT `super.onCreate` : le pont Capacitor construit sa liste de
           plugins pendant l'appel parent. Enregistré après, le plugin
           existerait côté Java sans jamais être joignable depuis la page. */
        registerPlugin(ReglagesSystemePlugin.class);
        super.onCreate(savedInstanceState);
    }
}
