package com.globalstroy.inspector;

import android.Manifest;
import android.app.Activity;
import android.app.AlertDialog;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.Gravity;
import android.view.KeyEvent;
import android.view.View;
import android.view.ViewGroup;
import android.webkit.CookieManager;
import android.webkit.GeolocationPermissions;
import android.webkit.PermissionRequest;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import android.widget.ImageButton;
import android.widget.Toast;

public class MainActivity extends Activity {

    private static final String HOST = "https://xn--e1afhkhdkdm.su";
    private static final String SITE = HOST + "/";
    private static final String APK_URL = "https://functions.poehali.dev/a8d47fc7-787b-4a3b-99d4-95bdd915c07a";
    private static final String VERSION_URL = "https://functions.poehali.dev/a8d47fc7-787b-4a3b-99d4-95bdd915c07a?info=1";

    private WebView web;
    private ValueCallback<Uri[]> filePath;
    private static final int REQ_FILE = 1001;
    private static final int REQ_PERM = 1002;

    @Override
    protected void onCreate(Bundle saved) {
        super.onCreate(saved);

        FrameLayout root = new FrameLayout(this);
        root.setBackgroundColor(Color.parseColor("#f5f5f5"));
        root.setLayoutParams(new ViewGroup.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));

        web = new WebView(this);
        web.setLayoutParams(new ViewGroup.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
        root.addView(web);

        root.addView(buildUpdateButton());
        setContentView(root);

        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setGeolocationEnabled(true);
        s.setAllowFileAccess(true);
        s.setAllowContentAccess(true);
        s.setLoadWithOverviewMode(true);
        s.setUseWideViewPort(true);
        s.setSupportZoom(true);
        s.setBuiltInZoomControls(true);
        s.setDisplayZoomControls(false);
        s.setJavaScriptCanOpenWindowsAutomatically(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setCacheMode(WebSettings.LOAD_DEFAULT);
        if (Build.VERSION.SDK_INT >= 21) {
            s.setMixedContentMode(WebSettings.MIXED_CONTENT_COMPATIBILITY_MODE);
            CookieManager.getInstance().setAcceptThirdPartyCookies(web, true);
        }
        CookieManager.getInstance().setAcceptCookie(true);

        askPermissions();

        web.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView v, String url) {
                if (url.endsWith(".apk")) {
                    openExternally(url);
                    return true;
                }
                if (url.startsWith("tel:") || url.startsWith("mailto:")
                        || url.startsWith("whatsapp:") || url.startsWith("tg:")) {
                    openExternally(url);
                    return true;
                }
                return false;
            }

            @Override
            public void onReceivedError(WebView v, int code, String desc, String url) {
                if (url != null && url.startsWith(SITE)) showOfflineScreen();
            }
        });

        web.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onGeolocationPermissionsShowPrompt(String origin,
                    GeolocationPermissions.Callback cb) {
                cb.invoke(origin, true, true);
            }

            @Override
            public void onPermissionRequest(final PermissionRequest req) {
                runOnUiThread(new Runnable() {
                    public void run() {
                        req.grant(req.getResources());
                    }
                });
            }

            @Override
            public boolean onShowFileChooser(WebView v,
                    ValueCallback<Uri[]> cb, FileChooserParams params) {
                if (filePath != null) filePath.onReceiveValue(null);
                filePath = cb;
                try {
                    Intent i = params.createIntent();
                    i.addCategory(Intent.CATEGORY_OPENABLE);
                    startActivityForResult(Intent.createChooser(i, "Выберите файл"), REQ_FILE);
                    return true;
                } catch (Exception e) {
                    filePath = null;
                    return false;
                }
            }
        });

        web.setDownloadListener(new android.webkit.DownloadListener() {
            public void onDownloadStart(String url, String ua, String cd,
                    String mime, long len) {
                openExternally(url);
            }
        });

        if (saved != null) {
            web.restoreState(saved);
        } else {
            web.loadUrl(SITE);
        }

        if (saved == null) {
            new Handler(Looper.getMainLooper()).postDelayed(new Runnable() {
                public void run() { checkUpdateSilently(); }
            }, 4000);
        }
    }

    /** Небольшая круглая кнопка обновления в правом нижнем углу. */
    private ImageButton buildUpdateButton() {
        ImageButton b = new ImageButton(this);
        b.setImageResource(R.drawable.ic_refresh);
        b.setBackgroundResource(R.drawable.btn_round);
        b.setContentDescription("Обновить приложение");
        b.setAlpha(0.55f);

        int size = (int) (48 * getResources().getDisplayMetrics().density);
        int pad = (int) (14 * getResources().getDisplayMetrics().density);
        FrameLayout.LayoutParams lp = new FrameLayout.LayoutParams(size, size);
        lp.gravity = Gravity.BOTTOM | Gravity.END;
        lp.setMargins(0, 0, pad, pad);
        b.setLayoutParams(lp);

        b.setOnClickListener(new View.OnClickListener() {
            public void onClick(View v) {
                v.setAlpha(1f);
                web.clearCache(true);
                web.loadUrl(SITE);
                Toast.makeText(MainActivity.this,
                        "Страница обновлена", Toast.LENGTH_SHORT).show();
                new Handler(Looper.getMainLooper()).postDelayed(new Runnable() {
                    public void run() { v.setAlpha(0.55f); }
                }, 1500);
            }
        });

        b.setOnLongClickListener(new View.OnLongClickListener() {
            public boolean onLongClick(View v) {
                askUpdateApp();
                return true;
            }
        });
        return b;
    }

    /** Фоновая проверка: не вышла ли новая версия приложения. */
    private void checkUpdateSilently() {
        new Thread(new Runnable() {
            public void run() {
                try {
                    java.net.HttpURLConnection c = (java.net.HttpURLConnection)
                            new java.net.URL(VERSION_URL + "&t="
                                    + System.currentTimeMillis()).openConnection();
                    c.setConnectTimeout(7000);
                    c.setReadTimeout(7000);
                    c.setRequestProperty("Cache-Control", "no-cache");
                    java.io.BufferedReader r = new java.io.BufferedReader(
                            new java.io.InputStreamReader(c.getInputStream(), "UTF-8"));
                    StringBuilder sb = new StringBuilder();
                    String ln;
                    while ((ln = r.readLine()) != null) sb.append(ln);
                    r.close();
                    c.disconnect();

                    org.json.JSONObject j = new org.json.JSONObject(sb.toString());
                    final int remote = j.optInt("versionCode", 0);
                    final String name = j.optString("versionName", "");
                    final String notes = j.optString("notes", "");
                    int local = getPackageManager()
                            .getPackageInfo(getPackageName(), 0).versionCode;

                    if (remote > local) {
                        runOnUiThread(new Runnable() {
                            public void run() { showUpdateDialog(name, notes); }
                        });
                    }
                } catch (Exception e) {
                    /* нет связи или файла версии - молча пропускаем */
                }
            }
        }).start();
    }

    private void showUpdateDialog(String name, String notes) {
        if (isFinishing()) return;
        String msg = "Доступна версия " + name + ".";
        if (notes != null && notes.length() > 0) msg += "\n\n" + notes;
        msg += "\n\nДанные и вход сохранятся.";
        new AlertDialog.Builder(this)
                .setTitle("Доступно обновление")
                .setMessage(msg)
                .setPositiveButton("Обновить",
                        new android.content.DialogInterface.OnClickListener() {
                            public void onClick(android.content.DialogInterface d, int w) {
                                openExternally(APK_URL);
                            }
                        })
                .setNegativeButton("Позже", null)
                .show();
    }

    /** Долгое нажатие — скачать свежую версию приложения. */
    private void askUpdateApp() {
        String ver;
        try {
            ver = getPackageManager().getPackageInfo(getPackageName(), 0).versionName;
        } catch (Exception e) {
            ver = "—";
        }
        new AlertDialog.Builder(this)
                .setTitle("Обновление приложения")
                .setMessage("Установленная версия: " + ver
                        + "\n\nСкачать и установить последнюю версию приложения?"
                        + " Данные и вход сохранятся.")
                .setPositiveButton("Обновить",
                        new android.content.DialogInterface.OnClickListener() {
                            public void onClick(android.content.DialogInterface d, int w) {
                                openExternally(APK_URL);
                            }
                        })
                .setNegativeButton("Отмена", null)
                .show();
    }

    private void openExternally(String url) {
        try {
            Intent i = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
            i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            startActivity(i);
        } catch (ActivityNotFoundException e) {
            Toast.makeText(this, "Не удалось открыть ссылку", Toast.LENGTH_SHORT).show();
        }
    }

    private void showOfflineScreen() {
        String html = "<html><head><meta name='viewport' content='width=device-width,"
                + "initial-scale=1'></head><body style=\"margin:0;font-family:sans-serif;"
                + "background:#f5f5f5;display:flex;align-items:center;justify-content:center;"
                + "height:100vh\"><div style='text-align:center;padding:24px'>"
                + "<div style='font-size:44px'>&#128246;</div>"
                + "<h2 style='margin:14px 0 6px;color:#1a1a1a'>Нет связи</h2>"
                + "<p style='color:#666;font-size:15px;line-height:1.5;max-width:280px'>"
                + "Проверьте интернет на телефоне. Данные сохранятся и отправятся, "
                + "как только связь появится.</p></div></body></html>";
        web.loadDataWithBaseURL(null, html, "text/html", "UTF-8", null);
    }

    private void askPermissions() {
        if (Build.VERSION.SDK_INT >= 23) {
            String[] need = new String[]{
                    Manifest.permission.ACCESS_FINE_LOCATION,
                    Manifest.permission.ACCESS_COARSE_LOCATION,
                    Manifest.permission.CAMERA};
            boolean ask = false;
            for (String p : need) {
                if (checkSelfPermission(p) != PackageManager.PERMISSION_GRANTED) ask = true;
            }
            if (ask) requestPermissions(need, REQ_PERM);
        }
    }

    @Override
    protected void onActivityResult(int req, int res, Intent data) {
        if (req == REQ_FILE) {
            if (filePath == null) return;
            Uri[] out = null;
            if (res == RESULT_OK && data != null) {
                if (data.getClipData() != null) {
                    int n = data.getClipData().getItemCount();
                    out = new Uri[n];
                    for (int i = 0; i < n; i++) {
                        out[i] = data.getClipData().getItemAt(i).getUri();
                    }
                } else if (data.getData() != null) {
                    out = new Uri[]{data.getData()};
                }
            }
            filePath.onReceiveValue(out);
            filePath = null;
            return;
        }
        super.onActivityResult(req, res, data);
    }

    @Override
    public boolean onKeyDown(int code, KeyEvent e) {
        if (code == KeyEvent.KEYCODE_BACK && web != null && web.canGoBack()) {
            web.goBack();
            return true;
        }
        return super.onKeyDown(code, e);
    }

    @Override
    protected void onSaveInstanceState(Bundle out) {
        super.onSaveInstanceState(out);
        if (web != null) web.saveState(out);
    }
}