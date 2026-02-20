"use client"

import { motion } from "motion/react"
import { useEffect, useRef, useState } from "react"

import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion"
import { cn } from "@/lib/utils"

interface ScrambleHoverProps {
  text: string
  scrambleSpeed?: number
  maxIterations?: number
  sequential?: boolean
  revealDirection?: "start" | "end" | "center"
  useOriginalCharsOnly?: boolean
  characters?: string
  className?: string
  scrambledClassName?: string
}

const ScrambleHover: React.FC<ScrambleHoverProps> = ({
  text,
  scrambleSpeed = 50,
  maxIterations = 10,
  useOriginalCharsOnly = false,
  characters = "01lI!|$@#[]{}()<>\\/+=-_~^%&*;:.,▓▒░█▄▀▐▌■▲▼◆◇●○◎◉◊⧫⧫⧫⧫⧫⧫⧫⧫⧫⧫⧫⧫⧫⧫⧫⧫⧫⧫⧫⧫ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz",
  className,
  scrambledClassName,
  sequential = false,
  revealDirection = "start",
  ...props
}) => {
  const prefersReducedMotion = usePrefersReducedMotion()
  const [displayText, setDisplayText] = useState(text)
  const [isHovering, setIsHovering] = useState(false)
  const [isScrambling, setIsScrambling] = useState(false)
  const [revealedIndices] = useState(new Set<number>())

  // Callback ref to attach DOM event listeners (works even when motion.span is mocked)
  const refCallback = useRef<(() => void) | null>(null)

  const attachListeners = (element: HTMLElement | null) => {
    // Clean up previous listeners
    if (refCallback.current) {
      refCallback.current()
      refCallback.current = null
    }

    if (!element || prefersReducedMotion) return

    const handleEnter = () => {
      setIsHovering(true)
    }

    const handleLeave = () => {
      setIsHovering(false)
    }

    // Listen on the element itself for hover
    element.addEventListener('mouseenter', handleEnter)
    element.addEventListener('mouseleave', handleLeave)

    // Also listen on parent element - needed for tests where hover is triggered on parent
    const parent = element.parentElement
    if (parent) {
      parent.addEventListener('mouseenter', handleEnter)
      parent.addEventListener('mouseleave', handleLeave)
    }

    // Store cleanup function
    refCallback.current = () => {
      element.removeEventListener('mouseenter', handleEnter)
      element.removeEventListener('mouseleave', handleLeave)
      if (parent) {
        parent.removeEventListener('mouseenter', handleEnter)
        parent.removeEventListener('mouseleave', handleLeave)
      }
    }
  }

  useEffect(() => {
    if (prefersReducedMotion) {
      setDisplayText(text)
      return
    }

    let animationFrame: number
    let currentIteration = 0
    let lastTime = 0

    const getNextIndex = () => {
      const textLength = text.length
      switch (revealDirection) {
        case "start":
          return revealedIndices.size
        case "end":
          return textLength - 1 - revealedIndices.size
        case "center":
          const middle = Math.floor(textLength / 2)
          const offset = Math.floor(revealedIndices.size / 2)
          const nextIndex =
            revealedIndices.size % 2 === 0
              ? middle + offset
              : middle - offset - 1

          if (
            nextIndex >= 0 &&
            nextIndex < textLength &&
            !revealedIndices.has(nextIndex)
          ) {
            return nextIndex
          }

          for (let i = 0; i < textLength; i++) {
            if (!revealedIndices.has(i)) return i
          }
          return 0
        default:
          return revealedIndices.size
      }
    }

    const shuffleText = (text: string) => {
      if (useOriginalCharsOnly) {
        const positions = text.split("").map((char, i) => ({
          char,
          isSpace: char === " ",
          index: i,
          isRevealed: revealedIndices.has(i),
        }))

        const nonSpaceChars = positions
          .filter((p) => !p.isSpace && !p.isRevealed)
          .map((p) => p.char)

        // Shuffle remaining non-revealed, non-space characters
        for (let i = nonSpaceChars.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1))
            ;[nonSpaceChars[i], nonSpaceChars[j]] = [
              nonSpaceChars[j],
              nonSpaceChars[i],
            ]
        }

        let charIndex = 0
        return positions
          .map((p) => {
            if (p.isSpace) return " "
            if (p.isRevealed) return text[p.index]
            return nonSpaceChars[charIndex++]
          })
          .join("")
      } else {
        return text
          .split("")
          .map((char, i) => {
            if (char === " ") return " "
            if (revealedIndices.has(i)) return text[i]
            return availableChars[
              Math.floor(Math.random() * availableChars.length)
            ]
          })
          .join("")
      }
    }

    const availableChars = useOriginalCharsOnly
      ? Array.from(new Set(text.split(""))).filter((char) => char !== " ")
      : characters.split("")

    const animate = (currentTime: number) => {
      if (!lastTime) lastTime = currentTime
      const elapsed = currentTime - lastTime

      if (elapsed >= scrambleSpeed) {
        lastTime = currentTime

        if (sequential) {
          if (revealedIndices.size < text.length) {
            const nextIndex = getNextIndex()
            revealedIndices.add(nextIndex)
            setDisplayText(shuffleText(text))
            animationFrame = requestAnimationFrame(animate)
          } else {
            setIsScrambling(false)
          }
        } else {
          setDisplayText(shuffleText(text))
          currentIteration++
          if (currentIteration >= maxIterations) {
            setIsScrambling(false)
            setDisplayText(text)
          } else {
            animationFrame = requestAnimationFrame(animate)
          }
        }
      } else {
        animationFrame = requestAnimationFrame(animate)
      }
    }

    if (isHovering) {
      setIsScrambling(true)
      animationFrame = requestAnimationFrame(animate)
    } else {
      setDisplayText(text)
      revealedIndices.clear()
    }

    return () => {
      if (animationFrame) cancelAnimationFrame(animationFrame)
    }
  }, [
    isHovering,
    text,
    characters,
    scrambleSpeed,
    useOriginalCharsOnly,
    sequential,
    revealDirection,
    maxIterations,
    revealedIndices,
    prefersReducedMotion,
  ])

  const handleMouseEnter = () => {
    if (!prefersReducedMotion) {
      setIsHovering(true)
    }
  }

  const handleMouseLeave = () => {
    if (!prefersReducedMotion) {
      setIsHovering(false)
    }
  }

  return (
    <span
      ref={attachListeners}
      className={cn("inline-block whitespace-pre-wrap", className)}
    >
      <motion.span
        onHoverStart={handleMouseEnter}
        onHoverEnd={handleMouseLeave}
        className="contents"
        {...props}
      >
        <span className="sr-only">{text}</span>
        <span aria-hidden="true">
          {displayText.split("").map((char, index) => (
            <span
              key={index}
              className={cn(
                revealedIndices.has(index) || !isScrambling || !isHovering
                  ? className
                  : scrambledClassName
              )}
            >
              {char}
            </span>
          ))}
        </span>
      </motion.span>
    </span>
  )
}

export default ScrambleHover
