# Instrucciones para generar el APK

Esta app tiene rastreo de ubicacion en segundo plano. Funciona incluso cuando el telefono esta bloqueado o la app minimizada.

## Requisitos

1. **Android Studio** - Descarga de: https://developer.android.com/studio
2. **Java JDK 17** - Android Studio lo instala automaticamente

## Pasos para generar el APK

### 1. Instalar dependencias
```bash
npm install
```

### 2. Construir la app web
```bash
npm run build
```

### 3. Sincronizar con Android
```bash
npx cap sync android
```

### 4. Abrir en Android Studio
```bash
npx cap open android
```

Esto abrira Android Studio con el proyecto.

### 5. Generar APK en Android Studio

1. Espera a que Android Studio termine de sincronizar Gradle (puede tardar unos minutos la primera vez)
2. Ve a **Build > Build Bundle(s) / APK(s) > Build APK(s)**
3. Espera a que termine la compilacion
4. El APK estara en: `android/app/build/outputs/apk/debug/app-debug.apk`

### 6. Instalar en el telefono

- Copia el archivo `app-debug.apk` a tu telefono
- Abre el archivo en el telefono
- Permite la instalacion de fuentes desconocidas si te lo pide
- Instala la app

## Permisos

La app pedira los siguientes permisos:
- **Ubicacion precisa** - Para rastrear la ubicacion
- **Ubicacion en segundo plano** - Para rastrear cuando la app esta cerrada
- **Notificaciones** - Para mostrar que el rastreo esta activo

## Uso

1. Abre la app
2. Selecciona tu nombre de vendedor
3. Presiona "Iniciar Seguimiento Continuo"
4. La app seguira enviando tu ubicacion incluso si cierras la app o bloqueas el telefono

## Notas

- El rastreo en segundo plano consume bateria. Se recomienda tener el telefono cargando o con bateria suficiente.
- La app muestra una notificacion mientras rastrea para que sepas que esta activa.
- Para detener el rastreo, abre la app y presiona el boton de detener (si lo implementas) o cierra la app desde el administrador de tareas.
