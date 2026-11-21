/**
 * Contenido de la portada (/) de la instancia USFQ Galápagos.
 *
 * Lo que cambia (fecha, formulario, organizaciones) se edita aquí y luego se
 * reconstruye la web. Las necesidades NO van aquí: la
 * portada las lee en vivo de la plataforma (necesidades validadas de la
 * emergencia), igual que los puntos del mapa.
 *
 * Regla: no publicar contactos personales. Solo instituciones.
 */
export const PORTADA = {
  emergenciaSlug: 'galapagos-2026',
  actualizado: 'miércoles 4 de noviembre de 2026, 07:00',

  /**
   * Aviso destacado en rojo arriba de la portada y de la página de la
   * emergencia. Para quitarlo, poner `aviso: null`.
   */
  aviso: {
    titulo: 'Hoy, sábado 21 de noviembre: se reportan inundaciones en Puerto Ayora y la parte alta',
    texto:
      'Desde las 05:00 hay reportes de vecinos de inundación en La Cascada (pasajes 4 y 5 y viviendas junto al cauce), la calle 8, Divino Niño, Curva Brava y el Parque El Bosque, y de vías colapsadas en la toma de agua y en la salida a Miramar. Llovió fuerte toda la noche en Bellavista, Cascajo y Santa Rosa. Si vives junto a un cauce o una encañada, sal ya hacia un lugar alto y no cruces calles por donde corre el agua. Emergencias: ECU 911. Son reportes ciudadanos de las 05:00 a las 06:30, no un comunicado oficial: sigue las indicaciones del COE y del ECU 911.',
  } as { titulo: string; texto: string } | null,

  formularioCOE:
    'https://docs.google.com/forms/d/e/1FAIpQLSe-wb4SGX8Z0IxRUCjMUBgY3XFLGGc-wwmfPux6aTaGxxOCzQ/viewform',

  /** Registro de damnificados del GAD Municipal de Santa Cruz (sitio oficial). */
  registroGAD: 'https://www.gadsantacruz.gob.ec/registro-damnificados/',

  /**
   * «Situación hoy»: lo que hay que saber, en frases cortas. Sale de los grupos
   * de coordinación (sociedad civil, ONG y USFQ) y de los comunicados que
   * circularon; sin teléfonos ni nombres de personas. Revisar cada día.
   */
  situacion: [
    {
      tema: 'Refugio',
      texto:
        'El único refugio autorizado es el Colegio Miguel Ángel Cazares (Puerto Ayora). Se está trasladando ahí a las familias de otros sitios y de hoteles.',
    },
    {
      tema: 'Donaciones en Santa Cruz',
      texto:
        'Centro de acopio oficial: Colegio Miguel Ángel Cazares. También recibe la bodega del club de ciclismo, junto al coliseo de Puerto Ayora (punto comunitario), que reparte a La Cascada, El Bosque, Guayabillos y Aguacatal.',
    },
    {
      tema: 'Comida',
      texto:
        'Las cocinas comunitarias de la Fundación Torraja y de La Colmena dan comida a las familias afectadas todos los días. Necesitan víveres, verduras y proteína.',
    },
    {
      tema: 'Salud',
      texto:
        'Según un aviso difundido el 2 de noviembre, desde el 4 hay controles para embarazadas y madres que acaban de dar a luz en el Centro de Energías Renovables (Pampas Coloradas). Confirma el horario en el centro de salud. Ante fiebre, acude al centro de salud: hay riesgo de dengue.',
    },
    {
      tema: 'Dengue',
      texto:
        'Elimina el agua estancada cerca de tu casa, usa repelente y duerme con mosquitero.',
    },
    {
      tema: 'Zonas que aún necesitan ayuda',
      texto:
        'Bellavista y Miconia (parte alta), El Bosque, Guayabillos, Aguacatal, Scalesia y Los Arrayanes. Hacen falta vehículos para llegar.',
    },
  ] as { tema: string; texto: string }[],


  /**
   * Organizaciones con trazabilidad. Cada enlace lleva a su red oficial
   * (verificada en su propio sitio web o en el perfil). Sin enlace = no se
   * encontró una cuenta oficial verificable. Nunca cuentas personales.
   */
  organizaciones: [
    {
      nombre: 'USFQ Galápagos · Galápagos Science Center',
      instagram: 'usfqgalapagos',
      // Instagram del GSC por confirmar: por ahora su página oficial de Facebook.
      enlaces: [{ etiqueta: 'Galápagos Science Center', url: 'https://www.facebook.com/GalapagosGSC/' }],
      // Campaña de donaciones de la USFQ (botón de pagos oficial de la universidad).
      donar: 'https://btnpagos.usfq.edu.ec/pagos/eventos.aspx?adm=810110836',
    },
    { nombre: 'Funcavid — Fundación Un Cambio por la Vida', instagram: 'fundacionuncambioxlavida' },
    { nombre: 'Fundación Charles Darwin (FCD)', instagram: 'charlesdarwinfoundation' },
    { nombre: 'Fundación Jocotoco', instagram: 'fundacion.jocotoco' },
    { nombre: 'Galápagos Life Fund', instagram: 'galapagos.life.fund' },
    { nombre: 'Galapagos Conservancy', instagram: 'galapagosconservancy' },
    { nombre: 'Fundación ECOS' },
    { nombre: 'CAPTURGAL — Cámara Provincial de Turismo de Galápagos', instagram: 'capturgal' },
    {
      nombre: 'Fundación Torraja corazones grandes — cocina comunitaria',
      enlaces: [{ etiqueta: 'Facebook', url: 'https://www.facebook.com/profile.php?id=100087466970206' }],
    },
  ] as { nombre: string; instagram?: string; whatsapp?: string; enlaces?: { etiqueta: string; url: string }[]; donar?: string }[],

  /**
   * Páginas de consulta del mismo dominio que sirve Caddy fuera de la app
   * (por eso van con <a>, no con <Link>). Ver deploy/sosgalapagos/Caddyfile.
   */
  consulta: [
    {
      titulo: 'Mapas y capas',
      ruta: '/mapas/',
      resumen:
        'Visor de las capas geográficas de la emergencia en Santa Cruz, San Cristóbal e Isabela, sin recortes e incluido el Parque Nacional.',
      contenido: [
        'Quebradas, zonas inundables, cuencas y costa baja',
        'Vías, población expuesta por isla y puntos clave',
        'Descarga en Shapefile o GeoJSON para QGIS o ArcGIS',
      ],
    },
    {
      titulo: 'Clima en vivo',
      ruta: '/clima/',
      resumen:
        'Lluvia y temperatura de las estaciones meteorológicas de Santa Cruz y San Cristóbal. Se actualiza cada 5 minutos.',
      contenido: [
        'Lluvia acumulada en 24 h por estación, en un mapa',
        'Comparación con la inundación del 30–31 de octubre',
        'Nivel de inundación por zona (preliminar, no oficial)',
      ],
    },
  ],

  /**
   * Organizaciones que atienden animales en Santa Cruz. Datos de pago
   * compartidos por la coordinación de la respuesta (2-nov-2026) y por las
   * propias fundaciones (4-nov-2026). De Juanchito solo se publica PayPal.
   */
  mascotas: [
    {
      nombre: 'Fundación Pan Animalia Galápagos',
      detalle: 'Atiende a los animales afectados. Recibe alimento para perros y gatos (balanceado o húmedo), collares y correas, kenneles o transportadoras y toallas.',
      banco: {
        banco: 'Banco del Pacífico',
        tipo: 'Cuenta corriente',
        numero: '8243689',
        titular: 'Fundación Pan Animalia Galápagos',
        idTipo: 'RUC',
        id: '2091767327001',
      },
    },
    {
      nombre: 'WVS South America',
      detalle: 'Clínica veterinaria en Puerto Ayora, en alianza con Worldwide Veterinary Service y Pan Animalia.',
      facebook: 'https://www.facebook.com/wvssouthamerica',
    },
    {
      nombre: 'Patitas Galapagueñas',
      facebook: 'https://www.facebook.com/patitasgalapaguenas',
      banco: {
        banco: 'Pichincha',
        tipo: 'Cuenta transaccional',
        numero: '2203496066',
        titular: 'Fátima Samanta Walthert',
        // Llegó como «Teléfono», pero tiene formato de cédula (provincia 17).
        idTipo: 'C.I.',
        id: '1757800683',
      },
    },
    {
      nombre: 'Juanchito al Rescate Galápagos',
      facebook: 'https://www.facebook.com/Juanchitoalrescategps',
      paypal: 'https://paypal.me/juanchitoalrescategp',
    },
  ] as {
    nombre: string;
    detalle?: string;
    facebook?: string;
    banco?: { banco: string; tipo: string; numero: string; titular: string; idTipo: string; id: string };
    paypal?: string;
  }[],

} as const;
