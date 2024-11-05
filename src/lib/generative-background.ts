function cssUnitToPixels(value: string) {
    const el = document.createElement('div')
    el.style.width = value
    el.style.height = value
    el.style.position = 'absolute'
    el.style.visibility = 'hidden'
    document.body.appendChild(el)
    const rect = el.getBoundingClientRect()
    document.body.removeChild(el)

    return rect.width
}

const CELL_SIZE = cssUnitToPixels('0.25rem')
console.log('CELL_SIZE', CELL_SIZE)
// const CELL_SIZE = 4

const MEAN_BRANCH_LENGTH = 9
const BRANCH_LENGTH_VARIANCE = 7

const DECAY = 0.99

const REPRODUCE_SPROUT = 0.01
const REPRODUCE_BRANCH = 1

function randomBranchLength() {
    return Math.max(1, Math.round(MEAN_BRANCH_LENGTH + (Math.random() - 0.5) * BRANCH_LENGTH_VARIANCE))
}

type Region = {
    contains(x: number, y: number): boolean
}

function createSelectorRegion(rootRect: DOMRect, avoidSelector: string, { padding }: { padding: number }): Region {
    const avoidRects = Array.from(document.querySelectorAll(avoidSelector)).map(el => el.getBoundingClientRect())

    return {
        contains(x: number, y: number) {
            return (
                rootRect.left < x &&
                x < rootRect.right &&
                rootRect.top < y &&
                y < rootRect.bottom &&
                !avoidRects.some(
                    rect =>
                        rect.left - padding < x &&
                        x < rect.right + padding &&
                        rect.top - padding < y &&
                        y < rect.bottom + padding
                )
            )
        },
    }
}

type Sprout = {
    x: number
    y: number
    direction: 'up' | 'down' | 'left' | 'right'
    stepsLeft: number
}

const DIRECTIONS = {
    up: [0, -1],
    down: [0, 1],
    left: [-1, 0],
    right: [1, 0],
}

const DIRECTIONS_CLOCKWISE: ('up' | 'right' | 'down' | 'left')[] = ['up', 'right', 'down', 'left']

const DIRECTIONS_OPPOSITE = {
    up: 'down',
    down: 'up',
    left: 'right',
    right: 'left',
}

function chooseRandom(arr: any[]) {
    return arr[Math.floor(Math.random() * arr.length)]
}

function rectContains(rect: DOMRect, x: number, y: number) {
    return rect.left < x && x < rect.right && rect.top < y && y < rect.bottom
}

function updateSprout(sprout: Sprout, region: { contains(x: number, y: number): boolean }): Sprout | null {
    sprout.stepsLeft--
    if (sprout.stepsLeft === 0) {
        if (Math.random() < DECAY) {
            const oldDirection = sprout.direction
            return {
                ...sprout,
                direction: chooseRandom(DIRECTIONS_CLOCKWISE.filter(dir => dir !== oldDirection)),
                stepsLeft: randomBranchLength(),
            }
        }

        return null
    }

    const direction = sprout.direction
    const x = sprout.x
    const y = sprout.y

    const [dx, dy] = DIRECTIONS[direction]

    const [ortX, ortY] = [dy, -dx]

    if (
        region.contains(x + dx, y + dy) &&
        region.contains(x + dx * 2, y + dy * 2) &&
        region.contains(x + ortX + dx, y + ortY + dy) &&
        region.contains(x - ortX + dx, y - ortY + dy) &&
        region.contains(x + ortX + dx * 2, y + ortY + dy * 2) &&
        region.contains(x - ortX + dx * 2, y - ortY + dy * 2)
    ) {
        return {
            ...sprout,
            x: x + dx * 2,
            y: y + dy * 2,
        }
    } else {
        if (Math.random() < 0.95) {
            const oldDirection = sprout.direction
            return {
                ...sprout,
                direction: chooseRandom(DIRECTIONS_CLOCKWISE.filter(dir => dir !== oldDirection)),
                stepsLeft: randomBranchLength(),
            }
        }

        return null
    }
}

type ParticleMap = {
    has(x: number, y: number): boolean
    set(x: number, y: number): void
    values(): { x: number; y: number }[]
}

function createParticleMap(): ParticleMap {
    const map = new Map<string, boolean>()

    return {
        has(x: number, y: number) {
            return map.has(`${x},${y}`)
        },
        set(x: number, y: number) {
            map.set(`${x},${y}`, true)
        },
        values() {
            return [
                ...map.keys().map(key => {
                    const [x, y] = key.split(',').map(Number)
                    return { x, y }
                }),
            ]
        },
    }
}

function createParticleMapArray(width: number, height: number): ParticleMap {
    width |= 0
    height |= 0

    const map = new Uint8Array(width * height)
    map.fill(0)

    return {
        has(x: number, y: number) {
            return map[y * width + x] === 1
        },
        set(x: number, y: number) {
            map[y * width + x] = 1
        },
        values() {
            return map.reduce((acc, cell, i) => {
                if (cell === 1) {
                    const x = i % width
                    const y = (i / width) | 0
                    acc.push({ x, y })
                }

                return acc
            }, [])
        },
    }
}

export function createGenerativeBackground(avoidSelector: string) {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    let width = document.body.scrollWidth
    let height = document.body.scrollHeight

    let sprouts: Sprout[] = []
    // const particles = createParticleMap()
    const particles: ParticleMap = createParticleMapArray(width / CELL_SIZE, height / CELL_SIZE)

    canvas.width = width
    canvas.height = height

    canvas.style.pointerEvents = 'none'
    canvas.style.position = 'absolute'
    canvas.style.top = '0'
    canvas.style.left = '0'
    canvas.style.zIndex = '-1'

    document.body.appendChild(canvas)

    const rootRect = new DOMRect(0, 0, width, height)

    const documentRegion = createSelectorRegion(rootRect, avoidSelector, {
        padding: CELL_SIZE * 1.5,
    })

    const particleMapRegion = {
        contains(x: number, y: number) {
            return particles.has(x, y)
        },
    }

    const validRegion = {
        contains(x: number, y: number) {
            return documentRegion.contains(x * CELL_SIZE, y * CELL_SIZE) && !particleMapRegion.contains(x, y)
        },
    }

    function draw() {
        ctx.resetTransform()
        ctx.clearRect(0, 0, width, height)
        ctx.translate(0.5, 0.5)

        particles.values().forEach(({ x, y }) => {
            ctx.fillStyle = '#eeeef4'
            ctx.fillRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE + 0.5, CELL_SIZE + 0.5)
        })

        sprouts.forEach(sprout => {
            const x = sprout.x * CELL_SIZE
            const y = sprout.y * CELL_SIZE

            ctx.fillStyle = '#dddde4'
            ctx.fillRect(x, y, CELL_SIZE + 0.5, CELL_SIZE + 0.5)
        })
    }

    function update() {
        console.time('update')

        const viewportRect = new DOMRect(
            document.documentElement.scrollLeft,
            document.documentElement.scrollTop,
            document.documentElement.clientWidth,
            document.documentElement.clientHeight
        )

        sprouts = sprouts.flatMap(sprout => {
            const viewportX = sprout.x * CELL_SIZE
            const viewportY = sprout.y * CELL_SIZE

            if (!rectContains(viewportRect, viewportX, viewportY)) {
                particles.set(sprout.x, sprout.y)
                return [sprout]
            }

            const newSprouts: Sprout[] = []

            const newSprout = updateSprout(sprout, validRegion)
            if (newSprout) {
                const { x: oldX, y: oldY } = sprout
                const { x: newX, y: newY } = newSprout

                const midX = (oldX + newX) / 2
                const midY = (oldY + newY) / 2

                particles.set(midX, midY)
                particles.set(newX, newY)

                newSprouts.push(newSprout)

                if (Math.random() < REPRODUCE_SPROUT) {
                    const oldDirection = sprout.direction
                    const avoidDirections = [oldDirection, DIRECTIONS_OPPOSITE[oldDirection]]

                    const direction = chooseRandom(DIRECTIONS_CLOCKWISE.filter(dir => !avoidDirections.includes(dir)))
                    newSprouts.push({
                        x: newX,
                        y: newY,
                        direction,
                        stepsLeft: randomBranchLength(),
                    })
                }
            }

            return newSprouts
        })

        // while (sprouts.length > 1000) {
        //     const i = Math.floor(Math.random() * sprouts.length)
        //     const sprout = sprouts[i]
        //     if (rectContains(viewportRect, sprout.x * CELL_SIZE, sprout.y * CELL_SIZE)) {
        //         sprouts.splice(i, 1)
        //     }
        // }

        for (let i = 0; i < REPRODUCE_BRANCH; i++) {
            const cell = chooseRandom(particles.values())

            sprouts.push({
                x: cell.x,
                y: cell.y,
                direction: chooseRandom(DIRECTIONS_CLOCKWISE),
                stepsLeft: randomBranchLength(),
            })
        }

        console.timeEnd('update')
    }

    function loop() {
        draw()
        update()
    }

    const DENSITY = 0.015

    // random sprouts everywhere
    for (let i = 0; i < (Math.sqrt(width * height) * DENSITY) ** 2; i++) {
        const newSprout = {
            x: Math.floor((Math.random() * width) / CELL_SIZE) | 1,
            y: Math.floor((Math.random() * height) / CELL_SIZE) | 1,
            direction: chooseRandom(DIRECTIONS_CLOCKWISE),
            stepsLeft: randomBranchLength(),
        }

        if (validRegion.contains(newSprout.x, newSprout.y)) {
            sprouts.push(newSprout)
        }
    }

    // just on left and right sides
    // for (let i = 0; i < (height / CELL_SIZE) * DENSITY; i++) {
    //     sprouts.push({
    //         x: 0,
    //         y: ((height / CELL_SIZE) * Math.random()) | 1, // odd
    //         direction: 'right',
    //         stepsLeft: randomBranchLength(),
    //     })
    // }
    // for (let i = 0; i < (height / CELL_SIZE) * DENSITY; i++) {
    //     sprouts.push({
    //         x: width / CELL_SIZE - 1,
    //         y: ((height / CELL_SIZE) * Math.random()) | 1, // odd
    //         direction: 'left',
    //         stepsLeft: randomBranchLength(),
    //     })
    // }

    setInterval(loop, 1000 / 25)
}
