/**
 * Marca da aplicação.
 *
 * O arquivo vive em `client/public`, então é servido pela raiz do site e não
 * passa pelo bundler por isso a referência é uma string de caminho e não um
 * import de asset.
 */
export const ARKA_LOGO_URL = '/arka-horizontal.webp';
export const USER_AVATAR_URL = '/user.webp';

export interface DocumentLogoProps {
  src: string;
  className: string;
}

/**
 * Props da logo nos documentos imprimíveis.
 *
 * A marca da Arka é branca foi desenhada para o fundo escuro da interface e
 * por isso sumia no papel. Nos documentos ela sai com `doc-logo-mono`, que pinta
 * a arte de preto sem exigir um segundo arquivo. Logo cadastrada pela empresa em
 * Configurações vai como está: pode ser colorida e não deve ser repintada.
 */
export function documentLogoProps(companyLogoUrl?: string): DocumentLogoProps {
  const custom = companyLogoUrl?.trim();

  return custom
    ? { src: custom, className: 'doc-logo' }
    : { src: ARKA_LOGO_URL, className: 'doc-logo doc-logo-mono' };
}

export interface LogoBitmap {
  /** PNG em data URL, formato que o jsPDF aceita. */
  dataUrl: string;
  width: number;
  height: number;
}

/** Uma conversão por URL: o mesmo PNG serve para todos os relatórios da sessão. */
const bitmapCache = new Map<string, Promise<LogoBitmap | null>>();

/**
 * Carrega a logo e devolve um PNG pronto para o jsPDF.
 *
 * A marca é um `.webp` e o jsPDF não decodifica esse formato, então a imagem é
 * desenhada em um canvas e reexportada como PNG. Devolve `null` quando a imagem
 * não carrega (arquivo ausente, logo externa fora do ar, canvas bloqueado por
 * CORS) nesse caso o relatório sai sem logo, e não quebrado.
 *
 * Com `monochrome`, a arte é repintada de preto sobre fundo branco: é assim que a
 * marca da Arka (branca, feita para a interface escura) fica visível no papel.
 */
export function loadLogoBitmap(
  url: string = ARKA_LOGO_URL,
  monochrome = false
): Promise<LogoBitmap | null> {
  const cacheKey = monochrome ? `mono:${url}` : url;
  const cached = bitmapCache.get(cacheKey);
  if (cached) return cached;

  const task = new Promise<LogoBitmap | null>((resolve) => {
    const image = new Image();
    // Necessário para logos hospedadas em outro domínio: sem isto o canvas
    // fica "tainted" e o toDataURL lança.
    image.crossOrigin = 'anonymous';

    image.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = image.naturalWidth;
        canvas.height = image.naturalHeight;

        const context = canvas.getContext('2d');
        if (!context) {
          resolve(null);
          return;
        }

        context.drawImage(image, 0, 0);

        if (monochrome) {
          // `source-in` mantém só o recorte da arte e troca a cor dela por preto;
          // `destination-over` põe o papel branco atrás, evitando depender de
          // transparência dentro do PDF.
          context.globalCompositeOperation = 'source-in';
          context.fillStyle = '#0f172a';
          context.fillRect(0, 0, canvas.width, canvas.height);

          context.globalCompositeOperation = 'destination-over';
          context.fillStyle = '#ffffff';
          context.fillRect(0, 0, canvas.width, canvas.height);
        }

        resolve({
          dataUrl: canvas.toDataURL('image/png'),
          width: canvas.width,
          height: canvas.height
        });
      } catch {
        resolve(null);
      }
    };

    image.onerror = () => resolve(null);
    image.src = url;
  });

  bitmapCache.set(cacheKey, task);
  return task;
}
