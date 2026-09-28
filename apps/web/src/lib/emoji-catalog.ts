// Catálogo de emojis para el EmojiPicker del admin (tipos de lugar, categorías).
// Cada emoji lleva palabras clave en español, sin tildes, para el buscador:
// "teatro", "museo", "boliche", "pena"... Un emoji aparece en un solo grupo.

export interface EmojiEntry {
  emoji: string;
  keywords: string;
}

export interface EmojiGroup {
  label: string;
  emojis: EmojiEntry[];
}

export const EMOJI_GROUPS: EmojiGroup[] = [
  {
    label: "Espacios y lugares",
    emojis: [
      { emoji: "🏛️", keywords: "centro cultural museo institucion edificio historico" },
      { emoji: "🏟️", keywords: "estadio cancha polideportivo recital" },
      { emoji: "🏠", keywords: "casa espacio cultural casona" },
      { emoji: "🏡", keywords: "casa quinta jardin patio" },
      { emoji: "🏢", keywords: "edificio oficina cowork" },
      { emoji: "🏫", keywords: "escuela colegio universidad instituto taller" },
      { emoji: "🏬", keywords: "shopping galeria centro comercial" },
      { emoji: "🏨", keywords: "hotel alojamiento hostel" },
      { emoji: "🏰", keywords: "castillo salon fiestas" },
      { emoji: "⛪", keywords: "iglesia capilla parroquia" },
      { emoji: "🏭", keywords: "fabrica galpon industrial nave" },
      { emoji: "🏗️", keywords: "obra construccion espacio en obra" },
      { emoji: "🏘️", keywords: "barrio vecinal sociedad de fomento" },
      { emoji: "🏚️", keywords: "casona antigua galpon abandonado under" },
      { emoji: "⛲", keywords: "plaza fuente paseo" },
      { emoji: "🌳", keywords: "parque plaza arbol aire libre" },
      { emoji: "🌲", keywords: "bosque pinar naturaleza" },
      { emoji: "🏞️", keywords: "parque natural rio lago paisaje" },
      { emoji: "🏖️", keywords: "playa balneario rio verano" },
      { emoji: "🏕️", keywords: "camping campamento acampe" },
      { emoji: "⛺", keywords: "carpa camping festival" },
      { emoji: "🌄", keywords: "mirador montaña amanecer barda" },
      { emoji: "🎡", keywords: "parque de diversiones feria kermesse" },
      { emoji: "🎢", keywords: "parque de diversiones juegos" },
      { emoji: "🎠", keywords: "calesita infantil ninos plaza" },
      { emoji: "🚉", keywords: "estacion tren ferrocarril" },
      { emoji: "🗽", keywords: "monumento turismo" },
      { emoji: "🌉", keywords: "puente costanera" },
    ],
  },
  {
    label: "Cultura y espectáculos",
    emojis: [
      { emoji: "🎭", keywords: "teatro independiente obra actuacion sala" },
      { emoji: "🎬", keywords: "cine cineclub pelicula audiovisual" },
      { emoji: "🎞️", keywords: "cine pelicula proyeccion" },
      { emoji: "📽️", keywords: "cine proyector proyeccion" },
      { emoji: "🎪", keywords: "circo carpa salon eventos varieté" },
      { emoji: "🤹", keywords: "circo malabares artistas callejeros" },
      { emoji: "🎨", keywords: "arte galeria pintura taller" },
      { emoji: "🖼️", keywords: "museo galeria arte muestra exposicion" },
      { emoji: "🏺", keywords: "museo historia arqueologia" },
      { emoji: "🗿", keywords: "museo escultura monumento" },
      { emoji: "📚", keywords: "biblioteca libros libreria" },
      { emoji: "📖", keywords: "libreria lectura biblioteca" },
      { emoji: "✍️", keywords: "escritura taller literario poesia" },
      { emoji: "📷", keywords: "fotografia foto estudio" },
      { emoji: "🎥", keywords: "video filmacion estudio audiovisual" },
      { emoji: "🎟️", keywords: "entradas boleteria ticket" },
      { emoji: "💃", keywords: "baile danza milonga tango salsa" },
      { emoji: "🕺", keywords: "baile boliche disco" },
      { emoji: "🪩", keywords: "boliche disco fiesta bola de espejos" },
      { emoji: "🩰", keywords: "danza ballet estudio de danza" },
      { emoji: "🎩", keywords: "magia show espectaculo" },
      { emoji: "😂", keywords: "stand up humor comedia" },
      { emoji: "🧸", keywords: "infantil ninos juguetes" },
    ],
  },
  {
    label: "Música",
    emojis: [
      { emoji: "🎶", keywords: "musica club recital" },
      { emoji: "🎵", keywords: "musica nota" },
      { emoji: "🎼", keywords: "musica partitura conservatorio orquesta" },
      { emoji: "🎸", keywords: "guitarra rock bar musica en vivo" },
      { emoji: "🎤", keywords: "microfono karaoke canto recital" },
      { emoji: "🎙️", keywords: "radio podcast estudio grabacion" },
      { emoji: "🎧", keywords: "dj electronica auriculares" },
      { emoji: "🎹", keywords: "piano teclado" },
      { emoji: "🥁", keywords: "bateria percusion tambor murga" },
      { emoji: "🎷", keywords: "saxo jazz" },
      { emoji: "🎺", keywords: "trompeta banda" },
      { emoji: "🎻", keywords: "violin orquesta clasica" },
      { emoji: "🪕", keywords: "banjo folklore pena" },
      { emoji: "🪗", keywords: "acordeon chamame folklore pena" },
      { emoji: "📻", keywords: "radio" },
    ],
  },
  {
    label: "Deporte y recreación",
    emojis: [
      { emoji: "⚽", keywords: "futbol club cancha" },
      { emoji: "🏀", keywords: "basquet club" },
      { emoji: "🏐", keywords: "voley" },
      { emoji: "🎾", keywords: "tenis padel" },
      { emoji: "🏓", keywords: "ping pong tenis de mesa" },
      { emoji: "🥊", keywords: "boxeo artes marciales" },
      { emoji: "🏊", keywords: "natacion pileta" },
      { emoji: "🚴", keywords: "ciclismo bici" },
      { emoji: "🏃", keywords: "running maraton carrera" },
      { emoji: "🧘", keywords: "yoga meditacion bienestar" },
      { emoji: "🏋️", keywords: "gimnasio gym" },
      { emoji: "⛳", keywords: "golf" },
      { emoji: "🐎", keywords: "caballo hipodromo jineteada campo" },
      { emoji: "🛹", keywords: "skate skatepark" },
      { emoji: "⛸️", keywords: "patin patinaje" },
      { emoji: "🎳", keywords: "bowling bolos" },
      { emoji: "🎯", keywords: "dardos tiro" },
      { emoji: "🎲", keywords: "juegos de mesa ludoteca" },
      { emoji: "♟️", keywords: "ajedrez club" },
      { emoji: "🎮", keywords: "videojuegos gamer arcade" },
      { emoji: "🎰", keywords: "casino tragamonedas" },
    ],
  },
  {
    label: "Gastronomía",
    emojis: [
      { emoji: "🍺", keywords: "cerveza cerveceria bar" },
      { emoji: "🍻", keywords: "cerveza brindis bar" },
      { emoji: "🍷", keywords: "vino vinoteca bodega" },
      { emoji: "🍇", keywords: "uva bodega vendimia" },
      { emoji: "🥂", keywords: "brindis champagne salon eventos" },
      { emoji: "🍾", keywords: "champagne fiesta" },
      { emoji: "🍸", keywords: "bar tragos coctel" },
      { emoji: "🍹", keywords: "tragos coctel playa" },
      { emoji: "🧉", keywords: "mate pena folklore" },
      { emoji: "☕", keywords: "cafe cafeteria" },
      { emoji: "🍵", keywords: "te casa de te" },
      { emoji: "🍽️", keywords: "restaurante comida" },
      { emoji: "🥩", keywords: "parrilla asado carne" },
      { emoji: "🍖", keywords: "asado carne cordero" },
      { emoji: "🍗", keywords: "pollo rotiseria" },
      { emoji: "🍕", keywords: "pizza pizzeria" },
      { emoji: "🍔", keywords: "hamburguesa hamburgueseria" },
      { emoji: "🌭", keywords: "pancho" },
      { emoji: "🌮", keywords: "tacos mexicano" },
      { emoji: "🌯", keywords: "wrap burrito" },
      { emoji: "🥪", keywords: "sandwich" },
      { emoji: "🥟", keywords: "empanadas" },
      { emoji: "🍝", keywords: "pastas italiano" },
      { emoji: "🍜", keywords: "ramen sopa oriental" },
      { emoji: "🍣", keywords: "sushi japones" },
      { emoji: "🥗", keywords: "ensalada vegano vegetariano saludable" },
      { emoji: "🥘", keywords: "paella guiso" },
      { emoji: "🧀", keywords: "queso picada fiambreria" },
      { emoji: "🥐", keywords: "panaderia medialunas" },
      { emoji: "🥖", keywords: "pan panaderia" },
      { emoji: "🍰", keywords: "torta pasteleria" },
      { emoji: "🧁", keywords: "cupcake pasteleria dulce" },
      { emoji: "🍩", keywords: "donas dulce" },
      { emoji: "🍫", keywords: "chocolate chocolateria" },
      { emoji: "🍦", keywords: "helado heladeria" },
      { emoji: "🥤", keywords: "bebida gaseosa" },
      { emoji: "🥡", keywords: "comida para llevar rotiseria delivery" },
      { emoji: "🚚", keywords: "food truck delivery" },
    ],
  },
  {
    label: "Comunidad y otros",
    emojis: [
      { emoji: "🏪", keywords: "local tienda almacen otro" },
      { emoji: "🛒", keywords: "mercado supermercado" },
      { emoji: "🛍️", keywords: "feria compras emprendedores" },
      { emoji: "🧺", keywords: "feria mercado artesanal" },
      { emoji: "🧵", keywords: "costura textil artesanias" },
      { emoji: "🎉", keywords: "fiesta celebracion salon eventos" },
      { emoji: "🎊", keywords: "fiesta cotillon" },
      { emoji: "🎈", keywords: "cumpleanos infantil globos" },
      { emoji: "🎁", keywords: "regalos" },
      { emoji: "🎓", keywords: "educacion universidad capacitacion" },
      { emoji: "💼", keywords: "negocios empresa networking" },
      { emoji: "🤝", keywords: "comunidad asociacion ong solidario" },
      { emoji: "❤️", keywords: "solidario amor" },
      { emoji: "🌈", keywords: "diversidad lgbt" },
      { emoji: "♻️", keywords: "reciclaje ambiente sustentable" },
      { emoji: "🌿", keywords: "naturaleza huerta ecologia" },
      { emoji: "🌻", keywords: "vivero jardin flores" },
      { emoji: "🐾", keywords: "mascotas animales petfriendly" },
      { emoji: "🔥", keywords: "fogon fuego destacado" },
      { emoji: "⭐", keywords: "estrella destacado" },
      { emoji: "🌙", keywords: "noche nocturno" },
      { emoji: "📍", keywords: "lugar ubicacion punto" },
    ],
  },
];

function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

/** Grupos filtrados por búsqueda (sin tildes, por prefijo de cualquier
 * palabra clave). Vacío → todos. Los grupos sin coincidencias se omiten. */
export function searchEmojiGroups(query: string): EmojiGroup[] {
  const q = normalize(query);
  if (!q) return EMOJI_GROUPS;
  return EMOJI_GROUPS.map((group) => ({
    ...group,
    emojis: group.emojis.filter((entry) =>
      normalize(`${entry.keywords} ${group.label}`)
        .split(/\s+/)
        .some((word) => word.startsWith(q)),
    ),
  })).filter((group) => group.emojis.length > 0);
}
