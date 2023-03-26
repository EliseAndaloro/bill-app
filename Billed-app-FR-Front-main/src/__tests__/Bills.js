/**
 * @jest-environment jsdom
 */

import '@testing-library/jest-dom'
import { screen, waitFor } from "@testing-library/dom"
import userEvent from '@testing-library/user-event'

import BillsUI from "../views/BillsUI.js"
import Bills from "../containers/Bills.js";
import { bills } from "../fixtures/bills.js"
import { ROUTES_PATH, ROUTES } from "../constants/routes.js";
import {localStorageMock} from "../__mocks__/localStorage.js";
import mockStore from "../__mocks__/store"

import router from "../app/Router.js";

jest.mock("../app/store", () => mockStore)

describe("Given I am connected as an employee", () => {
  describe("When I am on Bills Page", () => {
    test("Then bill icon in vertical layout should be highlighted", async () => {

      Object.defineProperty(window, 'localStorage', { value: localStorageMock })
      window.localStorage.setItem('user', JSON.stringify({
        type: 'Employee'
      }))
      const root = document.createElement("div")
      root.setAttribute("id", "root")
      document.body.append(root)
      router()
      window.onNavigate(ROUTES_PATH.Bills)
      await waitFor(() => screen.getByTestId('icon-window'))
      const windowIcon = screen.getByTestId('icon-window')
      //to-do write expect expression
      expect(windowIcon.classList.contains("active-icon")).toBe(true)

    })
    test("Then bills should be ordered from earliest to latest", () => {
      document.body.innerHTML = BillsUI({ data: bills });
      const dates = screen
          .getAllByText(
              /^(19|20)\d\d[- /.](0[1-9]|1[012])[- /.](0[1-9]|[12][0-9]|3[01])$/i
          )
          .map((a) => a.innerHTML);
      const antiChrono = (a, b) => a - b ;
      const datesSorted = [...dates].sort(antiChrono);
      expect(dates).toEqual(datesSorted);
    });
  })
})

// NEW BILL BUTTON
describe("Given I am on the Bills page", () => {
  describe("When I click on the NewBill button", () => {
    test("Then it should send me to the newBill page", () => {
      // environnement de test
      //  __mocks__/localStorage.js
      Object.defineProperty(window, 'localStorage', { value: localStorageMock })
      // initialisation de l'user comme employee avec le localStorage
      window.localStorage.setItem('user', JSON.stringify({ type: 'Employee' }))
      // mise en place de la class pour tester à partir de l'environnemnet simulé
      const onNavigate = (pathname) => {
        document.body.innerHTML = ROUTES({ pathname })
      }
      const billsPage = new Bills({
        document,
        onNavigate,
        store:null,
        localStorage:localStorageMock
      })
      // page bills
      document.body.innerHTML = BillsUI({ data:bills })
      // mock de la fonction handleClickNewBill
      const handleClickNewBill = jest.fn(billsPage.handleClickNewBill)

      const buttonNewBill = document.querySelector(`button[data-testid="btn-new-bill"]`)
      buttonNewBill.addEventListener('click',handleClickNewBill)
      // Simulation du click sur le bouton
      userEvent.click(buttonNewBill)

      // On s'attend à ce que la fonction handleClickNewBill soit appelée
      expect(handleClickNewBill).toHaveBeenCalled()
      // On s'attend à voir 'envoyer une note de frais' sur la page
      expect(screen.getByText('Envoyer une note de frais')).toBeTruthy()
    })
  })
})

// MODAL
describe("Given I am on the Bills page", () => {
  describe("When I click on IconEye Button", () => {
    test("Then, It should open the modal", () => {
      const onNavigate = (pathname) => {
        document.body.innerHTML = ROUTES({ pathname })
      }
      Object.defineProperty(window, 'localStorage', { value: localStorageMock })
      window.localStorage.setItem('user', JSON.stringify({ type: 'Employee' }))

      const billsPage = new Bills({
        document,
        onNavigate,
        store:mockStore,
        localStorage:localStorageMock
      })

      document.body.innerHTML = BillsUI({ data:bills })
      $.fn.modal = jest.fn(); // fonction mocké de jquery

      // mock de la fonction
      const handleClickIcon = jest.fn((e) => billsPage.handleClickIconEye(e))

      const iconEyes = screen.getAllByTestId('icon-eye')

      iconEyes[0].addEventListener('click', () => handleClickIcon(iconEyes[0]))

      //iconEyes.forEach(icon => {
      //  icon.addEventListener("click", () =>
      //    handleClickIcon(icon)
      //  )
      //});
      // simulation du click sur l'icon
      userEvent.click(iconEyes[0])

      // La fonction handleClickIcon doit être appelée
      expect(handleClickIcon).toHaveBeenCalled()
      // Justificatif doit apparaitre sur la page
      expect(screen.getByText('Justificatif')).toBeTruthy()
    })
  })
})

// TEST INTEGRATION GET
describe("Given I am a user connected as Employee",() => {
  describe("When I navigate to Bills Page", () => {
    test("Then, it should fetches bills from mock API GET", async () => {
      localStorage.setItem("user", JSON.stringify({ type:"Employee", email:"a@a"}))
      const root = document.createElement("div")
      root.setAttribute("id", "root")
      document.body.append(root)
      router()
      window.onNavigate(ROUTES_PATH.Bills)
      await waitFor(()=>screen.getAllByText("Mes notes de frais"))
      const ticketName = await screen.getByText("encore")
      expect(ticketName).toBeTruthy()
    })

    describe("When an error occurs on API", ()=>{
      beforeEach(()=>{
        jest.spyOn(mockStore,"bills")
        Object.defineProperty(
            window,
            'localStorage',
            { value: localStorageMock }
        )
        window.localStorage.setItem('user', JSON.stringify({
          type: 'Employee',
          email: "a@a"
        }))
        const root = document.createElement("div")
        root.setAttribute("id", "root")
        document.body.appendChild(root)
        router()
      })
      test("then it should fetch bills from an API and fails with a 404 message error", async () => {
        mockStore.bills.mockImplementationOnce(() => {
          return {
            list : () =>  {
              return Promise.reject(new Error("Erreur 404"))
            }
          }})
        window.onNavigate(ROUTES_PATH.Bills)
        await new Promise(process.nextTick)
        const message = await screen.getByText(/Erreur 404/)
        expect(message).toBeTruthy()
      })

      test("then it should fetch messages from an API and fails with 500 message error", async () => {
        mockStore.bills.mockImplementationOnce(() => {
          return {
            list : () =>  {
              return Promise.reject(new Error("Erreur 500"))
            }
          }})

        window.onNavigate(ROUTES_PATH.Bills)
        await new Promise(process.nextTick);
        const message = await screen.getByText(/Erreur 500/)
        expect(message).toBeTruthy()
      })
    })
  })
})
