import React, { useState, useRef, useEffect } from 'react';
import { formatImageUrl, getProxyImageUrl, fetchWikipediaImage, isWikipediaArticleUrl } from '../utils/imageUtils';
import { Image as ImageIcon, Loader2 } from 'lucide-react';

interface SmartImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string | undefined | null;
  alt: string;
  fallbackSrc?: string;
  wikiUrl?: string;
  className?: string;
  adaptive?: boolean;
}

export const SmartImageComponent: React.FC<SmartImageProps> = ({
  src,
  alt,
  fallbackSrc,
  wikiUrl,
  className = '',
  adaptive = false,
  onError,
  onLoad,
  ...rest
}) => {
  const [resolvedWikiImg, setResolvedWikiImg] = useState<string | null>(null);
  const [loadingWiki, setLoadingWiki] = useState(false);

  // Check if src itself is a Wikipedia article link or if we need to auto-pull from wikiUrl
  const isWikiSrc = isWikipediaArticleUrl(src);
  const targetWiki = wikiUrl || (isWikiSrc ? src || undefined : undefined);

  useEffect(() => {
    let active = true;
    if (targetWiki && (!src || isWikiSrc || !resolvedWikiImg)) {
      setLoadingWiki(true);
      fetchWikipediaImage(targetWiki).then((img) => {
        if (active && img) {
          setResolvedWikiImg(img);
        }
        if (active) {
          setLoadingWiki(false);
        }
      });
    }
    return () => {
      active = false;
    };
  }, [src, targetWiki, isWikiSrc]);

  const effectiveSrc = (isWikiSrc ? resolvedWikiImg : src || resolvedWikiImg) || fallbackSrc || '';
  const formattedUrl = formatImageUrl(effectiveSrc);

  // stage: 'direct' | 'proxy' | 'fallback'
  const [stage, setStage] = useState<'direct' | 'proxy' | 'fallback'>('direct');
  const [failedSrc, setFailedSrc] = useState<string | null>(null);

  // Reset stage if src prop changes
  const prevSrcRef = useRef(src);
  if (prevSrcRef.current !== src) {
    prevSrcRef.current = src;
    setStage('direct');
    setFailedSrc(null);
  }

  const activeImage =
    stage === 'proxy' && formattedUrl
      ? getProxyImageUrl(formattedUrl)
      : stage === 'fallback'
      ? fallbackSrc || resolvedWikiImg || ''
      : formattedUrl || resolvedWikiImg || fallbackSrc || '';

  const handleError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    setFailedSrc(src || null);
    if (stage === 'direct' && formattedUrl && !formattedUrl.startsWith('data:') && !formattedUrl.startsWith('blob:')) {
      // Direct attempt failed: fallback to proxy
      setStage('proxy');
    } else if (targetWiki && !resolvedWikiImg) {
      // Direct & proxy failed, try fetching Wikipedia image if targetWiki exists
      fetchWikipediaImage(targetWiki).then((img) => {
        if (img) {
          setResolvedWikiImg(img);
          setStage('direct');
        } else {
          setStage('fallback');
          if (onError) onError(e);
        }
      });
    } else {
      // Both direct & proxy failed or invalid source
      setStage('fallback');
      if (onError) onError(e);
    }
  };

  const handleLoad = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    if (onLoad) onLoad(e);
  };

  // Render placeholder if source is empty or fallback failed without fallbackSrc
  if ((!activeImage || stage === 'fallback') && !fallbackSrc && !loadingWiki) {
    return (
      <div className={`bg-slate-950 border border-slate-800/80 flex flex-col items-center justify-center text-slate-500 p-3 select-none ${className}`}>
        <ImageIcon className="w-7 h-7 opacity-40 mb-1" />
        <span className="text-[10px] font-mono tracking-wider opacity-60 uppercase truncate max-w-[90%] text-center">
          {alt || 'No Image'}
        </span>
      </div>
    );
  }

  if (loadingWiki && !activeImage) {
    return (
      <div className={`bg-slate-950 border border-slate-800/80 flex flex-col items-center justify-center text-slate-500 p-3 select-none ${className}`}>
        <Loader2 className="w-6 h-6 animate-spin text-amber-500/70 mb-1" />
        <span className="text-[10px] font-mono tracking-wider opacity-60 uppercase truncate max-w-[90%] text-center">
          Loading Wiki Image...
        </span>
      </div>
    );
  }

  if (adaptive) {
    return (
      <div className={`relative overflow-hidden flex items-center justify-center bg-slate-950 ${className}`}>
        {/* Ambient backdrop */}
        <img
          src={activeImage}
          alt=""
          aria-hidden="true"
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          className="absolute inset-0 w-full h-full object-cover scale-110 opacity-35 pointer-events-none select-none transition-opacity duration-200 transform-gpu"
        />

        {/* Foreground image */}
        <img
          {...rest}
          src={activeImage}
          alt={alt}
          loading={rest.loading || 'lazy'}
          decoding="async"
          referrerPolicy="no-referrer"
          onError={handleError}
          onLoad={handleLoad}
          className="relative z-10 max-w-full max-h-full w-auto h-auto object-contain drop-shadow-md group-hover:scale-105 transition-transform duration-200 transform-gpu"
        />
      </div>
    );
  }

  return (
    <img
      {...rest}
      src={activeImage}
      alt={alt}
      loading={rest.loading || 'lazy'}
      decoding="async"
      referrerPolicy="no-referrer"
      onError={handleError}
      onLoad={handleLoad}
      className={className}
    />
  );
};

export const SmartImage = React.memo(SmartImageComponent);
