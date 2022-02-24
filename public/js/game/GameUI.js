import config from '../../gameConfig.json' assert { type: "json" }
import { DisplayItem } from './DisplayItem.js'
import { Modal } from '../Modal.js'

String.prototype.capitalize = function() {
    return this.charAt(0).toUpperCase() + this.slice(1)
}

export class GameUI {


    constructor(gameBoard, httpClient, audioManager) {

        this.board = gameBoard
        this.http = httpClient
        this.audio = audioManager.it
        this.audioManager = audioManager

        this.modal = new Modal(this.audio, this.transferAction)

        this.coins = new DisplayItem(config.DOMids.coins, 100, this.audio)
        this.bet = new DisplayItem(config.DOMids.bet, 1, this.audio)
        this.win = new DisplayItem(config.DOMids.win, 0, this.audio)

        this.constrolsInit()
        this.sessionInit()

    }



    constrolsInit = () => {
        if (Array.isArray(config.DOMids.controls)) 
            config.DOMids.controls.forEach(item => {
                document.getElementById(item.id)
                .addEventListener('click', () => eval(`this.on${item.id.capitalize()}()`))
            })
    }



    sessionInit = async () => {
        let sessionId = localStorage.getItem('sessionId')
        console.log('sessionId')
        console.log(sessionId)
        if (!sessionId) {
            const newSession = await this.http.newSession()
            console.log('newSession')
            console.log(newSession)
            localStorage.setItem('sessionId', newSession)
        }
        const sessions = localStorageSetSessions()
        console.log(sessions)

        const sessionData = await this.http.getSessionData()
        console.log(sessionData)
        this.setDisplayState(sessionData)
    }



    // BUTTONS

    onBetUp = async () => {
        const newBet = await this.http.betUp()
        if (newBet !== this.bet.get()) {
            this.audio.betUp.play()
            this.bet.set(newBet)
            this.board.bet = newBet
        }
    }
    
    
    onBetDown = async () => {
        const newBet = await this.http.betDown()
        if (newBet !== this.bet.get()) {
            this.audio.betDown.play()
            this.bet.set(newBet)
            this.board.bet = newBet
            console.log(this.board.bet)
        } 
    }
    


    onTransfer = async () => {
        this.modal.open()
        this.modal.setHeader(`Transfer WIN > COINS`)
        this.modal.addOkButton()
        this.modal.put(this.transferModalInput())
    }


    
    onReset = async () => {
        console.log('onReset')
        if (await this.http.stopSession()) {
            this.audio.reset.play()
            const sessionId = await this.http.newSession()
            localStorage.setItem('sessionId', sessionId)
            this.setDisplayState(await this.http.getSessionData())
        }
    }



    onSpin = async () => {

        if (this.board.spinFlag) {
            try {
                const spinResponse = await this.http.spin()
                if (spinResponse === 201) {this.notEnoughCoins(); return 0 }
                console.log(spinResponse)
                this.board.setCurrentState(spinResponse.board)
                this.coins.animateTo(spinResponse.coins, config.ui.transferTime, false)
                setTimeout(() => this.board.stopSpin(), config.spin.spinTime)
                await this.board.spin()
                await this.board.highlightScore()
                
                if (spinResponse.win > this.win.get()) this.win.animateTo(spinResponse.win, config.ui.transferTime, true)
                this.board.spinFlag = true

            } catch (error) {
                console.log(error)
            }
        }
    }



    onPlus = () => this.audioManager.volumeUp()
    


    onMinus = () => this.audioManager.volumeDown()


    onScores = async () => {
        try{
            const sessionsIds = localStorage.getItem('sessions').split(',')
            if (Array.isArray(sessionsIds) && sessionsIds.length>0) {
                const response = await this.http.postHref(sessionsIds, 'scores-page')
                if (!response) throw new Error('scores page error')
            } else throw new Error('scores page error')
        } catch (error) {console.log(error)}
    }



    notEnoughCoins = () => {
        this.audio.spin.pause()
        this.audio.spinning.pause()
        this.audio.spin.load()
        this.audio.spinning.load()
        this.audio.notEnough.play()
        this.coins.active()
        this.coins.deactive()
        this.modal.open()
        this.modal.removeOkButton()
        this.modal.setHeader("not enought coins")
    }



    transferModalInput = () => {
        const input = document.createElement('input')
        input.classList.add('transfer-input')
        if (this.win.get() < 100) input.value = this.win.get()
        else input.value = 100
        input.type = 'number'
        input.addEventListener('input', (event) => this.onInputTransfer(event, input))
        return input
    }

    transferAction = async (e) => {
        this.board.spinFlag = false
        const input = document.getElementById('modal').querySelector('input')
        const response = await this.http.transfer({"transfer": input.value})
        this.modal.close()
        if (parseInt(response.win) !== this.win.get()) {
            this.coins.animateTo(response.coins, config.ui.transferTime, true)
            await this.win.animateTo(response.win, config.ui.transferTime, false)
        }
        this.board.spinFlag = true
    }

    onInputTransfer = (e, input) => {
        if (input.value > this.win.get()) input.value = this.win.get()
        if (input.value < 0) input.value = 0
    }



    setDisplayState = (state) => {
        this.coins.set(state.coins)
        this.bet.set(state.bet)
        this.win.set(state.win)
        this.board.bet = state.bet
    }
}

const localStorageSetSessions = () => {
    const sessionId = localStorage.getItem('sessionId')
    let sessions = localStorage.getItem('sessions')
    if (sessions) {
        sessions = sessions.split(',')
        const isSessionInLocalStorageArr = () => (sessions.indexOf(sessionId) !== -1)
        if (!isSessionInLocalStorageArr()) {
            let newSessions = [...sessions]
            newSessions.push(sessionId)
            localStorage.setItem('sessions', newSessions)
        }
        return localStorage.getItem('sessions').split(',')
    }

    else localStorage.setItem('sessions', sessionId)
    return localStorage.getItem('sessions').split(',')
}







