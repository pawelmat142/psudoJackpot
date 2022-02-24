const scoreGenerator = require('./ScoreGenerator')
const query = require('../database/Query')

// SESSION

exports.newSession = async (req, res, next) => {
    try {
        const session = await query.newSessionId()
        if (session) res.json(session)
        else throw new Error('db response error')
    }
    catch (error) { next(error) }
}


exports.getSession = async (req, res, next) => {
    try {
        const sessionId = req.params.sessionId
        const lastSpin = await query.getLastSpinBySessionId(sessionId)
        if (lastSpin) {
            const minutesAgo = parseInt( ( Date.now() - new Date(lastSpin.time).getTime() ) / 1000 / 60 )
            if (minutesAgo < 10) {
                const session = await query.getSessionById(sessionId)
                if (session) { res.json(session) }
                else throw new Error('db response error')
            }
            else {
                const newSessionId = await query.newSessionId()
                if (newSessionId) {
                    const session = await query.getSessionById(newSessionId)
                    if (session) res.json(session)
                    else throw new Error('new session error')
                } else throw new Error('db response error')
            }
        } else {
            const session = await query.getSessionById(sessionId)
            if (session) { res.json(session) }
            else throw new Error('db response error')
        }
    }
    catch (error) { next(error) }
}


exports.stopSession = async (req, res, next) => {
    try {
        const sessionId = req.params.sessionId
        console.log(sessionId)
        if (await query.stopSessionById(sessionId)) res.json(true)
        else throw new Error('db response error')
    }
    catch (error) { next(error) }
}


// BET

exports.betUp = async (req, res, next) => {
    try {
        const sessionId = req.params.sessionId
        const sessionData = await query.getSessionById(sessionId)
        if (sessionData) { 
            let bet = parseInt(sessionData.bet)
            const result = await query.updateBetBySessionId(sessionId, bet + 1)
            if (result) res.json(bet + 1)
            else throw new Error('db response error')
        }
        else throw new Error('db response error')
    }
    catch (error) { next(error) }
}


exports.betDown = async (req, res, next) => {
    try {
        const sessionId = req.params.sessionId
        const sessionData = await query.getSessionById(sessionId)
        if (sessionData) {
            let bet = parseInt(sessionData.bet)
            if (bet > 1) {
                const result = await query.updateBetBySessionId(sessionId, bet - 1)
                if (result) res.json(bet - 1)
                else throw new Error('db response error')
            } else res.json(bet)
        } else throw new Error('db response error')
    } catch (error) { next(error) }
}


// TRANSFER

exports.transfer = async (req, res, next) => {
    console.log('server - transfer')
    try {
        const transfer = parseInt(req.body.transfer)
        const sessionId = req.params.sessionId
        const sessionData = await query.getSessionById(sessionId)
        if (sessionData) {
            if (transfer <= sessionData.win) {
                let win = await query.updateWinBySessionId(sessionId, sessionData.win - transfer) 
                let coins = await query.updateCoinsBySessionId(sessionId, sessionData.coins + transfer)
                if (win && coins || parseInt(win) === 0) {
                    res.json({
                        coins: coins,
                        bet: sessionData.bet,
                        win: win
                    })
                } else throw new Error('db response error')
            } else throw new Error('not enough win')
        } else throw new Error('db response error')
    } catch (error) { next(error) }
}


// SPIN

exports.spin = async (req, res, next) => {
    try {
        const score = scoreGenerator.getScore()
        const board = scoreGenerator.getBoard(score)
        const sessionId = req.params.sessionId
        const sessionData = await query.getSessionById(sessionId)
        if (sessionData) {
            const bet = parseInt(sessionData.bet)
            if (sessionData.coins < sessionData.bet) res.status(201).json({board: "not enough win"})
            else {
                const spin = await query.addSpin(sessionId, score, bet)
                if (spin) {
                    const coins = await query.updateCoinsBySessionId(sessionId, parseInt(sessionData.coins - bet))
                    const win = await query.updateWinBySessionId(sessionId, parseInt(sessionData.win + parseInt(spin.score) * bet))
                    if (coins && win || parseInt(win) === 0 || parseInt(coins) === 0) {
                        res.json({
                            // board : [
                            //     ['W','W','W'],
                            //     ['W','W','W'],
                            //     ['W','W','W']
                            // ],
                            board: board,
                            coins: coins,
                            bet: bet,
                            win: win
                        })
                        console.log(`session: ${sessionId}, score: ${score}, bet: ${bet} `)
                        console.log(board)
                    } else throw new Error('db response error')
                } else throw new Error('db response error')
            }
        } else throw new Error('db response error')
    } catch (error) { next(error) }
}



// TEST

exports.test = async (req, res) => {
    console.log('test')
    const a = await countSpins()
    console.log(`There are ${a} items`)
    res.json('test')
}


let scoreSum = 0
let shotCounter = 0
let totalScore = 0
exports.testing = (req, res) => {
    const testOnce = () => {
        const shot = scoreGenerator.getShot()
        const score = scoreGenerator.getScore(shot)
        scoreSum += score
        shotCounter++
        totalScore += score
        totalScore--
        console.log(`shot: ${shot}, score: ${score}`)
        console.log(`shotCounter: ${shotCounter}, totalScore: ${totalScore}, scoreSum: ${scoreSum}`)
    }
    for(let i = 0; i < 100000; i++) {
        testOnce()
    }
    res.json({testing: "testing"})
}