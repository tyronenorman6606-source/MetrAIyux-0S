#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');
const nexusRoot = path.join(repoRoot, 'metraiyux_0s_site', 'SkyeMusicNexus');
const storefrontRoot = path.join(nexusRoot, 'artist-storefronts');
const outputPath = path.join(nexusRoot, 'public', 'data', 'playlists.json');
const publicOrigin = (process.env.SKYE_MUSIC_NEXUS_PUBLIC_ORIGIN || 'https://skye-music-nexus.pages.dev').replace(/\/+$/, '');
const collectiveProducerName = 'Gray London Skyes';
const collectiveProducerCredit = 'Produced by Gray London Skyes';
const receiptPath = path.join(
  repoRoot,
  'test-artifacts',
  'reflection-and-collective-drops',
  'skyemusicnexus-playlists-build-latest.json',
);

const SKIP_STOREFRONTS = new Set([
  'artist-apps',
  'assets',
  'gray-skyes-collective',
  'local-artists',
  'reflection',
]);

function readJson(filePath, fallback = null) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return fallback;
  }
}

function titleCase(value) {
  return String(value || '')
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function toSlug(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function stableHash(value) {
  let hash = 0;
  for (const char of String(value || '')) {
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  }
  return hash;
}

function arrayify(value) {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (typeof value === 'string' && value.trim()) {
    return value
      .split(/[,\n|/]+/)
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
}

function genreBucket(values) {
  const source = values.join(' ').toLowerCase();
  if (/(r.?b mode|rnb mode|slow jam|neo soul|\bsoul\b)/i.test(source)) return 'R&B / Soul';
  if (/(rock|punk|metal|industrial|goth|grunge|ragecore)/i.test(source)) return 'Rock / Industrial';
  if (/(pop|hyperpop|dream.?pop|bedroom|synth.?pop)/i.test(source)) return 'Pop / Hyperpop';
  if (/(hip.?hop|rap|trap|drill|boom bap|rage)/i.test(source)) return 'Hip Hop / Rap';
  if (/(r.?b|alt.?r.?b)/i.test(source)) return 'R&B / Soul';
  if (/(electronic|edm|dance|house|techno|club|dj|ambient|drum.?and.?bass)/i.test(source)) return 'Electronic';
  if (/(folk|acoustic|country|americana|story)/i.test(source)) return 'Folk / Story';
  if (/(latin|reggaeton|afro|dancehall|island)/i.test(source)) return 'Global / Dance';
  return 'Indie / Alternative';
}

function pickArtistName(slug, profile, personality) {
  return (
    profile?.name ||
    profile?.artistName ||
    personality?.artistName ||
    personality?.name ||
    titleCase(slug)
  );
}

function collectGenres(profile, personality, product) {
  const values = [
    product?.title,
    product?.name,
    ...arrayify(profile?.genres),
    ...arrayify(profile?.genre),
    ...arrayify(profile?.primaryGenres),
    ...arrayify(personality?.genres),
    ...arrayify(personality?.primaryGenres),
    ...arrayify(personality?.music?.primaryGenres),
    ...arrayify(product?.genres),
    ...arrayify(product?.genre),
    product?.lane,
    product?.project,
  ].filter(Boolean);

  const bucket = genreBucket(values);
  const detailTags = [...new Set(values.map((item) => titleCase(item)).filter(Boolean))].slice(0, 4);
  return [...new Set([bucket, ...detailTags])];
}

function nexusRelativeFromArtist(slug, value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  if (/^https?:\/\//i.test(raw)) return raw;
  if (raw.startsWith('/SkyeMusicNexus/')) return raw.replace(/^\/SkyeMusicNexus\//, '');
  if (raw.startsWith('/')) return raw.replace(/^\/+/, '');
  if (raw.startsWith('../')) return raw.replace(/^\.\.\//, '');
  if (raw.startsWith('./')) return `artist-storefronts/${slug}/${raw.slice(2)}`;
  if (raw.startsWith('artist-storefronts/')) return raw;
  return `artist-storefronts/${slug}/${raw}`;
}

function hrefFromNexusRelative(relative) {
  if (!relative) return '';
  if (/^https?:\/\//i.test(relative)) return relative;
  return `../${relative.replace(/^\/+/, '')}`;
}

function publicUrlFromNexusRelative(relative) {
  if (!relative) return '';
  if (/^https?:\/\//i.test(relative)) return relative;
  return `${publicOrigin}/${relative.replace(/^\/+/, '')}`;
}

function fileExistsForNexusRelative(relative) {
  if (!relative || /^https?:\/\//i.test(relative)) return false;
  return fs.existsSync(path.join(nexusRoot, relative.replace(/^\/+/, '')));
}

function artistImage(slug, profile, personality) {
  const candidates = [
    profile?.visualIdentity?.portraitImage,
    personality?.visualIdentity?.portraitImage,
    profile?.portrait,
    profile?.image,
    profile?.avatar,
    profile?.heroImage,
    personality?.portrait,
    personality?.image,
    personality?.avatar,
    `./assets/artist-portrait.png`,
    `./assets/portrait.png`,
    `./assets/avatar.png`,
    `./media/images/gray-red-portrait.jpg`,
    `./media/images/gray-founder-portrait.jpg`,
    `./media/images/gray-wide-stage.jpg`,
    `../artist-storefronts/${slug}/assets/portrait.png`,
    `../artist-storefronts/${slug}/assets/avatar.png`,
    `../artist-storefronts/${slug}/assets/hero.png`,
  ].filter(Boolean);

  for (const candidate of candidates) {
    if (/^https?:\/\//i.test(candidate)) return candidate;
    const relative = nexusRelativeFromArtist(slug, candidate);
    if (fileExistsForNexusRelative(relative)) return hrefFromNexusRelative(relative);
  }

  return '../assets/og-card.svg';
}

function rotateCandidates(candidates, seed) {
  const clean = candidates.filter(Boolean);
  if (!clean.length) return [];
  const start = stableHash(seed) % clean.length;
  return [...clean.slice(start), ...clean.slice(0, start)];
}

function productCoverImage(slug, product, artistFallback) {
  const sourceImages = Array.isArray(product?.visualPackage?.sourceImages) ? product.visualPackage.sourceImages : [];
  const sourceImageCandidates = rotateCandidates(
    sourceImages.map((image) => image.packageFile || image.href || image.url || image.src),
    `${slug}:${product?.productId || product?.id || product?.title || ''}`,
  );
  const grayImagePool = slug === 'gray-skyes'
    ? rotateCandidates([
        './media/images/gray-red-portrait.jpg',
        './media/images/gray-shadow-portrait.jpg',
        './media/images/gray-ritual-portrait.jpg',
        './media/images/gray-wide-stage.jpg',
        './media/images/gray-founder-portrait.jpg',
        './assets/gray-london-skyes.jpg',
        './assets/founder-command-portrait.png',
      ], `${product?.productId || product?.id || product?.title || ''}`)
    : [];
  const candidates = [
    product?.coverImage,
    product?.coverArt,
    product?.imageUrl,
    product?.image,
    product?.visualPackage?.coverImage,
    product?.visualPackage?.coverArtUrl,
    ...sourceImageCandidates,
    product?.pwaUrl ? `${product.pwaUrl.replace(/^\/SkyeMusicNexus\/artist-storefronts\/[^/]+\//, '').replace(/\/?$/, '/') }cover.svg` : '',
    ...grayImagePool,
  ].filter(Boolean);

  for (const candidate of candidates) {
    if (/^https?:\/\//i.test(candidate)) return candidate;
    const relative = nexusRelativeFromArtist(slug, candidate);
    if (fileExistsForNexusRelative(relative) && /\.(png|jpe?g|webp|gif|svg)$/i.test(relative)) {
      return hrefFromNexusRelative(relative);
    }
  }
  return artistFallback;
}

function productsFromPayload(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.products)) return payload.products;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.records)) return payload.records;
  return [];
}

function publicNexusHref(value, slug) {
  if (!value) return '';
  const raw = String(value);
  if (/^https?:\/\//i.test(raw)) return raw;
  if (raw.startsWith('/SkyeMusicNexus/')) {
    return `../${raw.replace(/^\/SkyeMusicNexus\//, '')}`;
  }
  if (raw.startsWith('/')) return raw;
  if (raw.startsWith('../')) return raw;
  return `../artist-storefronts/${slug}/${raw}`;
}

function publicAudioUrl(value, slug) {
  if (!value) return '';
  const raw = String(value);
  if (/^https?:\/\//i.test(raw)) return raw;
  if (raw.startsWith('/SkyeMusicNexus/')) return publicUrlFromNexusRelative(raw.replace(/^\/SkyeMusicNexus\//, ''));
  if (raw.startsWith('/')) return raw;
  if (raw.startsWith('../')) return publicUrlFromNexusRelative(raw.replace(/^\.\.\//, ''));
  return publicUrlFromNexusRelative(`artist-storefronts/${slug}/${raw}`);
}

function productRoomHref(slug) {
  return `../artist-storefronts/${slug}/products/`;
}

function trackScore(track) {
  let score = 50;
  if (track.audioUrl) score += 30;
  if (track.visualPackage?.href || track.visualPackage?.status) score += 8;
  if (track.collaborators?.length) score += Math.min(10, track.collaborators.length * 5);
  if (/gray|reflection/i.test(`${track.artistName} ${track.title}`)) score += 4;
  if (track.createdAt) {
    const ageDays = Math.max(0, (Date.now() - Date.parse(track.createdAt)) / 86400000);
    if (Number.isFinite(ageDays)) score += Math.max(0, 32 - Math.min(32, ageDays / 2));
  }
  score += stableHash(track.trackId) % 11;
  return Math.round(score);
}

function collectTracks() {
  const artists = [];
  const tracks = [];
  const entries = fs
    .readdirSync(storefrontRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !SKIP_STOREFRONTS.has(entry.name))
    .sort((a, b) => a.name.localeCompare(b.name));

  for (const entry of entries) {
    const slug = entry.name;
    const artistDir = path.join(storefrontRoot, slug);
    const profile = readJson(path.join(artistDir, 'profile.json'), {});
    const personality = readJson(path.join(artistDir, 'personality-profile.json'), {});
    const productPayload = readJson(path.join(artistDir, 'products', 'products.json'), {});
    const products = productsFromPayload(productPayload);
    const artistName = pickArtistName(slug, profile, personality);
    const artistId = profile?.artistId || profile?.id || personality?.artistId || productPayload?.artistId || products[0]?.artistId || slug;
    const image = artistImage(slug, profile, personality);
    const artistTrackIds = [];

    for (const product of products) {
      const status = String(product.status || product.state || 'active').toLowerCase();
      const title = product.title || product.name || product.productName;
      const audioFile = product.audioFile || product.audio || product.audioUrl || product.sourceAudio;
      if (!title || !audioFile || /draft|inactive|archived/.test(status)) continue;

      const genres = collectGenres(profile, personality, product);
      const trackId = toSlug(`${slug}-${product.productId || product.id || title}`);
      const dropHref = publicNexusHref(product.pwaUrl || product.dropUrl || product.href, slug);
      const visualHref = product.visualPackage?.href ? publicNexusHref(product.visualPackage.href, slug) : '';
      const productId = product.productId || product.id || '';
      const coverImage = productCoverImage(slug, product, image);
      const track = {
        trackId,
        productId,
        title,
        artistId,
        artistSlug: slug,
        artistName,
        artistImage: image,
        coverImage,
        genre: genres[0] || 'Indie / Alternative',
        genres,
        audioUrl: publicAudioUrl(audioFile, slug),
        localAudioHref: publicNexusHref(audioFile, slug),
        dropUrl: dropHref || productRoomHref(slug),
        storeUrl: productRoomHref(slug),
        price: product.price || product.productPrice || '',
        status,
        lane: product.lane || product.project || '',
        producerName: product.producerName || product.producedBy || (product.collectiveId === 'gray-skyes-collective' ? collectiveProducerName : ''),
        producerCredit: product.producerCredit || product.productionCredit || (product.collectiveId === 'gray-skyes-collective' ? collectiveProducerCredit : ''),
        createdAt: product.createdAt || product.releasedAt || product.updatedAt || '',
        streamStats: {
          nexusStreams: Number(product.analytics?.nexusStreams || product.analytics?.streams || 0) || 0,
          playStarts: Number(product.analytics?.playStarts || 0) || 0,
          completePlays: Number(product.analytics?.completePlays || 0) || 0,
          listenSeconds: Number(product.analytics?.nexusListenSeconds || product.analytics?.listenSeconds || 0) || 0,
        },
        collaborators: arrayify(product.collaborators || product.collaboratorArtists || product.features),
        visualPackage: product.visualPackage
          ? {
              status: product.visualPackage.status || 'ready',
              href: visualHref,
              app: product.visualPackage.app || '',
            }
          : null,
      };
      track.score = trackScore(track);
      tracks.push(track);
      artistTrackIds.push(track.trackId);
    }

    if (artistTrackIds.length) {
      const artistGenres = [...new Set(artistTrackIds.flatMap((id) => tracks.find((track) => track.trackId === id)?.genres || []))];
      artists.push({
        artistSlug: slug,
        artistId,
        artistName,
        artistImage: image,
        genres: artistGenres.slice(0, 6),
        trackIds: artistTrackIds,
        score: artistTrackIds.reduce((sum, id) => sum + (tracks.find((track) => track.trackId === id)?.score || 0), 0),
        storefrontUrl: `../artist-storefronts/${slug}/`,
        productRoomUrl: productRoomHref(slug),
      });
    }
  }

  tracks.sort((a, b) => b.score - a.score || a.title.localeCompare(b.title));
  artists.sort((a, b) => b.score - a.score || a.artistName.localeCompare(b.artistName));
  return { artists, tracks };
}

function buildCharts(tracks, artists) {
  const genreMap = new Map();
  for (const track of tracks) {
    const genre = track.genre || 'Indie / Alternative';
    if (!genreMap.has(genre)) genreMap.set(genre, []);
    genreMap.get(genre).push(track.trackId);
  }

  const genreCharts = [...genreMap.entries()]
    .map(([genre, trackIds]) => ({
      genre,
      trackIds: trackIds
        .map((id) => tracks.find((track) => track.trackId === id))
        .filter(Boolean)
        .sort((a, b) => b.score - a.score)
        .map((track) => track.trackId),
    }))
    .filter((chart) => chart.trackIds.length)
    .sort((a, b) => b.trackIds.length - a.trackIds.length || a.genre.localeCompare(b.genre));

  return {
    overall: tracks.map((track) => track.trackId),
    trending: tracks.slice(0, 30).map((track) => track.trackId),
    newDrops: [...tracks]
      .filter((track) => track.createdAt)
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
      .slice(0, 30)
      .map((track) => track.trackId),
    genreCharts,
    artistCharts: artists.map((artist) => ({
      artistSlug: artist.artistSlug,
      artistName: artist.artistName,
      genres: artist.genres,
      trackIds: artist.trackIds,
      score: artist.score,
      storefrontUrl: artist.storefrontUrl,
      productRoomUrl: artist.productRoomUrl,
      artistImage: artist.artistImage,
    })),
  };
}

function buildPlaylists(tracks, charts) {
  const grayIds = tracks
    .filter((track) => /gray|reflection|brain/i.test(`${track.artistName} ${track.title}`))
    .map((track) => track.trackId);
  const visualReadyIds = tracks
    .filter((track) => track.visualPackage?.href || track.visualPackage?.status)
    .map((track) => track.trackId);

  return [
    {
      playlistId: 'overall-nexus',
      title: 'Nexus Overall',
      kind: 'system',
      description: 'All playable Music Nexus drops ranked by the local network score.',
      trackIds: charts.overall,
    },
    {
      playlistId: 'trending-now',
      title: 'Trending Now',
      kind: 'system',
      description: 'Fresh movement across drops, packages, collaborations, and release readiness.',
      trackIds: charts.trending,
    },
    {
      playlistId: 'new-drops',
      title: 'New Drops',
      kind: 'system',
      description: 'Recently packaged songs with active audio and store paths.',
      trackIds: charts.newDrops.length ? charts.newDrops : charts.trending,
    },
    {
      playlistId: 'gray-x-gray',
      title: 'Gray x Gray Signal',
      kind: 'system',
      description: 'Gray Skyes, Gray Brain, Reflection, and linked collective records.',
      trackIds: grayIds.length ? grayIds : charts.trending.slice(0, 12),
    },
    {
      playlistId: 'pics2vid-ready',
      title: 'Pics2Vid Ready',
      kind: 'system',
      description: 'Drops with visual packaging ready for video export.',
      trackIds: visualReadyIds.length ? visualReadyIds : charts.trending.slice(0, 12),
    },
  ].filter((playlist) => playlist.trackIds.length);
}

const { artists, tracks } = collectTracks();
const charts = buildCharts(tracks, artists);
const systemPlaylists = buildPlaylists(tracks, charts);
const payload = {
  schema: 'skyemusicnexus.playlists.v1',
  generatedAt: new Date().toISOString(),
  source: 'SkyeMusicNexus artist storefront product rooms',
  notes: [
    'Trending uses a deterministic local Nexus score from playable audio, recency, visual packaging, collaborations, and release readiness.',
    'User-created playlists are stored by the browser on the Discover surface and can be exported/imported as JSON.',
  ],
  totals: {
    artists: artists.length,
    tracks: tracks.length,
    genres: charts.genreCharts.length,
    systemPlaylists: systemPlaylists.length,
  },
  tracks,
  artists,
  charts,
  systemPlaylists,
  streamTelemetry: {
    eventEndpoint: 'https://metraiyux-0s-full-system.graylondonskyes.workers.dev/api/skymusicnexus/music-drops',
    eventAction: 'track-public-event',
    qualifiedStreamSeconds: 30,
    localStorageKey: 'skymusicnexus.streamLedger.v1',
    publicMetricBoundary: 'Nexus streams use one unified platform count. Local artist activity increments the same stream counter; external DSP and payout claims require separate proof.',
  },
};

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(payload, null, 2)}\n`);
fs.mkdirSync(path.dirname(receiptPath), { recursive: true });
fs.writeFileSync(
  receiptPath,
  `${JSON.stringify(
    {
      ok: true,
      generatedAt: payload.generatedAt,
      outputPath: path.relative(repoRoot, outputPath),
      totals: payload.totals,
      topTracks: tracks.slice(0, 10).map((track) => ({
        title: track.title,
        artistName: track.artistName,
        genre: track.genre,
        score: track.score,
      })),
    },
    null,
    2,
  )}\n`,
);

console.log(
  JSON.stringify(
    {
      ok: true,
      outputPath: path.relative(repoRoot, outputPath),
      receiptPath: path.relative(repoRoot, receiptPath),
      totals: payload.totals,
    },
    null,
    2,
  ),
);
