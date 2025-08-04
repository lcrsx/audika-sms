import { useCallback, useRef, useEffect, useState } from 'react'

export function useChatScroll() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [isAtBottom, setIsAtBottom] = useState(true)
  const [showScrollButton, setShowScrollButton] = useState(false)

  const checkScrollPosition = useCallback(() => {
    if (!containerRef.current) return

    const { scrollTop, scrollHeight, clientHeight } = containerRef.current
    const isBottom = scrollTop + clientHeight >= scrollHeight - 100
    setIsAtBottom(isBottom)
    setShowScrollButton(!isBottom)
  }, [])

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    if (!containerRef.current) return

    const container = containerRef.current
    container.scrollTo({
      top: container.scrollHeight,
      behavior,
    })
    
    // Update state after scrolling
    setTimeout(() => {
      setIsAtBottom(true)
      setShowScrollButton(false)
    }, 300)
  }, [])

  const scrollToTop = useCallback(() => {
    if (!containerRef.current) return

    const container = containerRef.current
    container.scrollTo({
      top: 0,
      behavior: 'smooth',
    })
  }, [])

  const scrollToMessage = useCallback((messageId: string) => {
    if (!containerRef.current) return

    const messageElement = containerRef.current.querySelector(`[data-message-id="${messageId}"]`)
    if (messageElement) {
      messageElement.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      })
    }
  }, [])

  // Auto-scroll to bottom when new messages arrive
  const autoScrollToBottom = useCallback(() => {
    if (isAtBottom) {
      scrollToBottom()
    }
  }, [isAtBottom, scrollToBottom])

  // Handle scroll events
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const handleScroll = () => {
      checkScrollPosition()
    }

    container.addEventListener('scroll', handleScroll, { passive: true })
    
    // Initial check
    checkScrollPosition()

    return () => {
      container.removeEventListener('scroll', handleScroll)
    }
  }, [checkScrollPosition])

  return { 
    containerRef, 
    scrollToBottom, 
    scrollToTop, 
    scrollToMessage, 
    autoScrollToBottom,
    isAtBottom,
    showScrollButton,
    checkScrollPosition
  }
}
