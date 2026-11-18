import { useParams, useNavigate, Link as RouterLink } from 'react-router-dom'
import { Heading } from '@astryxdesign/core/Heading'
import { Text } from '@astryxdesign/core/Text'
import { Token } from '@astryxdesign/core/Token'
import { Button } from '@astryxdesign/core/Button'
import { Icon } from '@astryxdesign/core/Icon'
import { EmptyState } from '@astryxdesign/core/EmptyState'
import { MarkdownRenderer } from '../../../shared/ui/MarkdownRenderer'
import { formatMonthDayWeekday } from '../../../shared/lib/datetime'
import { useAnnouncement } from '../useAnnouncements'
import { LoadErrorState, LoadingState } from '../../../shared/ui/LoadState'
import { PATHS } from '../../../app/routes/paths'
import type { Announcement } from '../../../shared/types'
import { useIsDesktop } from '../../../shared/hooks/useMediaQuery'

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatFileType(name: string): string {
  const extension = name.split('.').pop()
  return extension && extension !== name ? extension.slice(0, 4).toUpperCase() : 'FILE'
}

export function AnnouncementDetailPage() {
  const isDesktop = useIsDesktop()
  const { id } = useParams()
  const navigate = useNavigate()
  const { item, all, status, retry } = useAnnouncement(id)

  if (status === 'loading') return <LoadingState label="공지를 불러오고 있어요" />
  if (status === 'error') {
    return (
      <div className="mx-auto w-full max-w-3xl px-4">
        <LoadErrorState title="공지를 불러오지 못했어요" onRetry={retry} />
      </div>
    )
  }

  if (!item) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-16">
        <EmptyState
          title="공지를 찾을 수 없어요"
          description="삭제되었거나 잘못된 주소일 수 있어요."
          actions={
            <Button
              label="공지 목록으로"
              variant="secondary"
              onClick={() => navigate(PATHS.public.announcements)}
            />
          }
        />
      </div>
    )
  }

  // Find previous and next articles
  const currentIndex = all.findIndex((a) => a.id === item.id)
  const prevArticle = currentIndex > 0 ? all[currentIndex - 1] : null
  const nextArticle = currentIndex >= 0 && currentIndex < all.length - 1 ? all[currentIndex + 1] : null

  return <AnnouncementDetail item={item} prevArticle={prevArticle} nextArticle={nextArticle} isDesktop={isDesktop} onBack={() => navigate(PATHS.public.announcements)} />
}

/** One notice as cards: the notice itself, its attachments, and the notices before and after it. */
export function AnnouncementDetail({
  item,
  prevArticle,
  nextArticle,
  isDesktop,
  onBack,
}: {
  item: Announcement
  prevArticle: Announcement | null
  nextArticle: Announcement | null
  isDesktop: boolean
  onBack: () => void
}) {
  const publishedAt = item.publishedAt ?? item.createdAt
  const card = 'rounded-xl border border-border bg-surface'

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 pb-12 pt-4 sm:px-6 lg:gap-5 lg:pb-16 lg:pt-8">
      <div>
        <button
          type="button"
          onClick={onBack}
          className="-ms-1 inline-flex min-h-11 cursor-pointer items-center gap-0.5 rounded-[var(--radius-inner)] px-1 text-sm font-semibold text-accent hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-bg"
        >
          <Icon icon="chevronLeft" size="sm" color="inherit" />
          공지 목록
        </button>
      </div>

      {/* The notice itself: what kind and when, the title, then the body, in one card. */}
      <article className={`${card} flex flex-col gap-4 p-4.5 lg:p-6`}>
        <header className="flex flex-col gap-2 border-b border-border pb-4">
          <div className="flex flex-wrap items-center gap-1.5 text-xs text-secondary">
            {item.isPinned && <Token label="필독" color="yellow" size="sm" />}
            <span>{item.category}</span>
            <span aria-hidden className="text-disabled">
              ·
            </span>
            <time dateTime={publishedAt} className="tabular-nums">
              {formatMonthDayWeekday(publishedAt)}
            </time>
            <span aria-hidden className="text-disabled">
              ·
            </span>
            <span>총졸업준비위원회</span>
          </div>
          <Heading level={1} className="!text-xl !font-bold !leading-snug break-keep lg:!text-2xl">
            {item.title}
          </Heading>
        </header>
        <MarkdownRenderer content={item.content} compact={!isDesktop} />
      </article>

      {item.attachments && item.attachments.length > 0 && (
        <section aria-label="첨부 파일" className={`${card} flex flex-col gap-3 p-4.5`}>
          <Text type="label" weight="bold">
            첨부 파일 {item.attachments.length}
          </Text>
          <ul className="m-0 flex list-none flex-col divide-y divide-border p-0">
            {item.attachments.map((file) => (
              <li key={file.fileId} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-[var(--radius-inner)] bg-accent-muted text-xs font-extrabold text-accent">
                    {formatFileType(file.name)}
                  </span>
                  <span className="flex min-w-0 flex-col">
                    <span className="break-words text-sm font-semibold text-primary">{file.name}</span>
                    <span className="text-xs text-disabled">{formatFileSize(file.size)}</span>
                  </span>
                </div>
                <a
                  href={file.url}
                  download={file.name}
                  className="inline-flex min-h-10 shrink-0 items-center rounded-[var(--radius-inner)] bg-accent-muted px-3 text-sm font-bold text-accent no-underline hover:bg-tint-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-bg"
                >
                  다운로드
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}

      {(prevArticle || nextArticle) && (
        <nav aria-label="다른 공지" className={`${card} flex flex-col divide-y divide-border`}>
          {[
            { label: '이전 글', article: prevArticle },
            { label: '다음 글', article: nextArticle },
          ].map(({ label, article }) =>
            article ? (
              <RouterLink
                key={label}
                to={PATHS.public.announcement(article.id)}
                className="group flex min-h-12 items-center gap-4 px-4.5 py-3 text-sm no-underline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent-bg"
              >
                <span className="shrink-0 font-semibold text-secondary">{label}</span>
                <span className="min-w-0 flex-1 truncate text-primary group-hover:text-accent">{article.title}</span>
                <Icon icon="chevronRight" size="sm" color="secondary" />
              </RouterLink>
            ) : null,
          )}
        </nav>
      )}
    </div>
  )
}
