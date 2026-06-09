import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { ChatMessage } from '../../types'
import styles from './MessageBubble.module.css'

function MdContent({ content }: { content: string }) {
  return (
    <div className={styles.md}>
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        table: ({ children }) => (
          <div className={styles.tableScroll}>
            <table>{children}</table>
          </div>
        ),
        a: ({ href, children }) => (
          <a href={href} target="_blank" rel="noopener noreferrer">{children}</a>
        ),
        code: ({ className, children, ...props }) => {
          const isBlock = className?.startsWith('language-')
          return isBlock
            ? <code className={`${styles.codeBlock} ${className ?? ''}`} {...props}>{children}</code>
            : <code className={styles.inlineCode} {...props}>{children}</code>
        },
      }}
    >
      {content}
    </ReactMarkdown>
    </div>
  )
}

export function MessageBubble({ role, content }: Pick<ChatMessage, 'role' | 'content'>) {
  return (
    <div className={`${styles.msg} ${role === 'user' ? styles.user : styles.assistant}`}>
      {role === 'assistant' ? <MdContent content={content} /> : content}
    </div>
  )
}

export function TypingBubble() {
  return (
    <div className={styles.typing}>
      <span /><span /><span />
    </div>
  )
}
