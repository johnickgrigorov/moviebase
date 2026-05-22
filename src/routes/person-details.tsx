import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api, imgUrl, type PersonCastItem } from '../lib/tmdb';
import { BackButton } from '../components/back-button';
import { MediaCard } from '../components/media-card';
import { formatDate } from '../lib/format';
import { PersonSkeleton } from '../components/skeleton';

export function PersonDetails() {
  const { id } = useParams<{ id: string }>();
  const personId = Number(id);

  const { data: person, isLoading: loadingPerson } = useQuery({
    queryKey: ['person', personId],
    queryFn: () => api.personDetails(personId),
    enabled: !!personId,
  });

  const { data: credits, isLoading: loadingCredits } = useQuery({
    queryKey: ['person-credits', personId],
    queryFn: () => api.personCredits(personId),
    enabled: !!personId,
  });

  if (loadingPerson || !person) {
    return <PersonSkeleton />;
  }

  const photo = imgUrl(person.profile_path, 'w300');

  // Сортируем фильмографию по дате, убираем дубли
  const castItems: PersonCastItem[] = credits?.cast ?? [];
  const seen = new Set<string>();
  const uniqueCast = castItems
    .filter((m) => {
      const k = `${m.media_type}-${m.id}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    })
    .sort((a, b) => {
      const dateA = a.release_date ?? a.first_air_date ?? '';
      const dateB = b.release_date ?? b.first_air_date ?? '';
      return dateB.localeCompare(dateA);
    })
    .slice(0, 30);

  return (
    <div className="pb-8">
      <div className="pt-4 px-4 mb-5 flex items-start gap-3">
        <BackButton className="mt-1 shrink-0" />
      </div>

      <div className="px-4 flex gap-4">
        <div className="w-28 shrink-0">
          {photo ? (
            <img src={photo} alt={person.name} className="w-full rounded-xl object-cover shadow-lg" />
          ) : (
            <div className="w-full aspect-[2/3] rounded-xl bg-bg-elevated flex items-center justify-center text-text-dim text-3xl">
              👤
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0 pt-1">
          <h1 className="display-title text-2xl leading-tight">{person.name}</h1>
          <div className="text-2xs text-text-muted mt-1">{person.known_for_department}</div>
          {person.birthday && (
            <div className="text-2xs text-text-dim mt-2">
              <span className="text-text-muted">Дата рождения:</span> {formatDate(person.birthday)}
            </div>
          )}
          {person.deathday && (
            <div className="text-2xs text-text-dim mt-1">
              <span className="text-text-muted">Дата смерти:</span> {formatDate(person.deathday)}
            </div>
          )}
          {person.place_of_birth && (
            <div className="text-2xs text-text-dim mt-1 leading-snug">
              <span className="text-text-muted">Место рождения:</span> {person.place_of_birth}
            </div>
          )}
        </div>
      </div>

      {person.biography ? (
        <section className="mt-5 px-4">
          <h3 className="text-2xs uppercase tracking-wider text-text-dim mb-2">Биография</h3>
          <p className="text-sm text-text leading-relaxed line-clamp-6">{person.biography}</p>
        </section>
      ) : null}

      {uniqueCast.length > 0 && (
        <section className="mt-7">
          <h3 className="text-2xs uppercase tracking-wider text-text-dim mb-3 px-4">Фильмография</h3>
          {loadingCredits ? (
            <div className="grid grid-cols-3 gap-3 px-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="aspect-[2/3] bg-bg-elevated rounded-md animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3 px-4">
              {uniqueCast.map((m) => {
                const media = m.media_type === 'movie'
                  ? { id: m.id, media_type: 'movie' as const, title: m.title ?? '', original_title: m.original_title ?? '', release_date: m.release_date ?? '', poster_path: m.poster_path, backdrop_path: m.backdrop_path, vote_average: m.vote_average, vote_count: m.vote_count, overview: m.overview, genre_ids: m.genre_ids }
                  : { id: m.id, media_type: 'tv' as const, name: m.name ?? m.title ?? '', original_name: m.original_name ?? m.original_title ?? '', first_air_date: m.first_air_date ?? '', poster_path: m.poster_path, backdrop_path: m.backdrop_path, vote_average: m.vote_average, vote_count: m.vote_count, overview: m.overview, genre_ids: m.genre_ids };
                return (
                  <MediaCard
                    key={`${m.media_type}-${m.id}`}
                    media={media}
                  />
                );
              })}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
