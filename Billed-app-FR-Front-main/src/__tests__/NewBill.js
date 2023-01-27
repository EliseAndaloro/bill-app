/**
 * @jest-environment jsdom
 */

import '@testing-library/jest-dom'
import { fireEvent, screen, waitFor } from "@testing-library/dom"
import userEvent from '@testing-library/user-event'


import NewBillUI from "../views/NewBillUI.js"
import NewBill from "../containers/NewBill.js"
import { ROUTES_PATH, ROUTES } from "../constants/routes.js";
import {localStorageMock} from "../__mocks__/localStorage.js";
import mockStore from "../__mocks__/store"

import router from "../app/Router.js";

jest.mock("../app/store", () => mockStore) // je mock le Store, comme ça j'utilise mockstore et ces données dans __tests__/store.js

beforeEach(() => {
  Object.defineProperty(window, "localStorage", { value: localStorageMock }); // utilise le __mocks__/localStorage.js
  window.localStorage.setItem('user', JSON.stringify({ type: 'Employee' })); // initialise l'user comme employee avec le localStorage

  const root = document.createElement("div");
  root.setAttribute("id", "root");
  document.body.append(root);
  router();

  // je place le DOM
  document.body.innerHTML = NewBillUI();
  //j'utilise la route de la bonne page
  window.onNavigate(ROUTES_PATH.NewBill);
});

afterEach(() => {
  jest.resetAllMocks();
  document.body.innerHTML = "";
});

describe("Given I am connected as an employee", () => {
  describe("When I am on NewBill Page", () => {
    test("Then the newBill icon should be highlighted", () => {
      // const html = NewBillUI()
      // document.body.innerHTML = html
      const newBillIcon = screen.getByTestId("icon-mail");
      expect(newBillIcon).toHaveClass("active-icon")
    })

    test("Then, form should appear",()=> {
      const form= screen.getByTestId("form-new-bill")
      expect(form).toBeTruthy()
    })

    test("Then, form must have 5 required field",()=> {
      const expenseTypeInput = screen.getByTestId('expense-type')
      const expenseNameInput = screen.getByPlaceholderText(/vol paris londres/i)
      const datePickerInput =  screen.getByTestId('datepicker')
      const amountInput = screen.getByTestId("amount")
      const vatInput = screen.getByTestId("vat")
      const pctInput = screen.getByTestId("pct")
      const commentaryInput = screen.getByTestId('commentary')
      const fileInput = screen.getByTestId("file")

      expect(expenseTypeInput).toBeRequired()
      expect(datePickerInput).toBeRequired()
      expect(pctInput).toBeRequired()
      expect(amountInput).toBeRequired()
      expect(fileInput).toBeRequired()

      expect(expenseNameInput).not.toBeRequired()
      expect(vatInput).not.toBeRequired()
      expect(commentaryInput).not.toBeRequired()

    })

    describe("When uploading a file with a wrong extension",()=>{
      test("Then it should appear an error message", ()=>{
        const onNavigate = pathname => {
          document.body.innerHTML = ROUTES({ pathname });
        };
        const newBill = new NewBill({
          document,
          onNavigate,
          store: mockStore,
          localStorage: window.localStorage,
        });

        const fileInput = screen.getByTestId("file");
        const testHandleChangeFile= jest.fn((e) =>
            newBill.handleChangeFile(e));

        const fileText = new File(["foo"], "foo.txt", {
          type: "text/plain",
        });

        fileInput.addEventListener("change",testHandleChangeFile)
        userEvent.upload(fileInput, fileText)
        //console.log("fileInput", fileInput.files[0].name) // le fichier text est bien chargé

        expect(testHandleChangeFile).toHaveBeenCalledTimes(1)
        expect(fileInput).toHaveErrorMessage(/Vérifiez l'extension: jpg, jpeg ou png sont acceptés/i)
      })
    })

    describe("When I uploaded a file with a right extension",()=>{
      test("Then it should not have an error message", ()=>{
        const onNavigate = pathname => {
          document.body.innerHTML = ROUTES({ pathname });
        };
        const newBill = new NewBill({
          document,
          onNavigate,
          store: mockStore,
          localStorage: window.localStorage,
        });

        const fileInput = screen.getByTestId("file");
        const testHandleChangeFile= jest.fn((e) =>
            newBill.handleChangeFile(e));

        const fileJpg = new File(["img"], "Piqueture.jpg", {
          type: "image/jpg",
        });

        fileInput.addEventListener("change",testHandleChangeFile)
        userEvent.upload(fileInput, fileJpg)

        expect(testHandleChangeFile).toHaveBeenCalledTimes(1)
        expect(fileInput).not.toHaveErrorMessage(/Vérifiez l'extension: jpg, jpeg ou png sont acceptés/i)
        expect(fileInput.files[0]).toStrictEqual(fileJpg)

      })
    })
  })
})

// POST :
// test d'intégration qui vérifie click et complétion de formulaire

describe("Given I am connected as an employee 2",()=>{
  describe("When I am on the Newbill Page",()=>{
    describe("When I filled in correct format all the required fields", ()=>{
      test("Then, form should be valid", async () => {
        const onNavigate = pathname => {
          document.body.innerHTML = ROUTES({ pathname });
        };
        const newBill = new NewBill({
          document,
          onNavigate,
          store: mockStore,
          localStorage: window.localStorage,
        });

        // Inputs
        const expenseTypeInput = screen.getByTestId('expense-type')
        const datePickerInput =  screen.getByTestId('datepicker')
        const amountInput = screen.getByTestId("amount")
        const pctInput = screen.getByTestId("pct")
        const fileInput = screen.getByTestId("file");

        const form= screen.getByTestId("form-new-bill")

        // Fichier
        const file = new File(["img"], "test.jpg", {
          type: ["image/jpg"],
        });
        const testHandleChangeFile= jest.fn((e) =>
            newBill.handleChangeFile(e));
        fileInput.addEventListener("change",testHandleChangeFile)

        // On rempli le formulaire
        userEvent.selectOptions(screen.getByRole('combobox'),["Transports"])
        userEvent.type(datePickerInput, "2022-02-22")
        userEvent.type(amountInput,"222")
        userEvent.type(pctInput,"20")
        await userEvent.upload(fileInput, file)

        // formulaire valide
        expect(form).toHaveFormValues({
          expenseType:'Transports',
          datepicker:'2022-02-22',
          amount:222,
          pct:20,
          file:""
        })

        expect(amountInput).toBeValid()
        expect(expenseTypeInput).toBeValid()
        expect(datePickerInput).toBeValid()
        expect(pctInput).toBeValid()
        expect(fileInput.files[0]).toBeDefined()
        waitFor(()=>expect(fileInput.files[0]).toBeValid())

        expect(file.name).toBe("test.jpg")
        expect(file.type).toBe("image/jpg")
        expect(fileInput.files[0].name).toBe("test.jpg")
        expect(fileInput.files[0].type).toBe("image/jpg")

        expect(fileInput).toHaveClass("blue-border")
        expect(fileInput).toHaveAttribute("aria-invalid", "false")
      })
    })
    describe("When the form is submitted", ()=>{
      test("Then, it should render 'mes notes de frais' page, ", async  () => {
        const onNavigate = pathname => {
          document.body.innerHTML = ROUTES({ pathname });
        };
        const newBill = new NewBill({
          document,
          onNavigate,
          store: mockStore,
          localStorage: window.localStorage,
        });

        const form= screen.getByTestId("form-new-bill")


        const testHandleSubmit=jest.fn((e)=>newBill.handleSubmit(e))

        form.addEventListener("submit", testHandleSubmit)
        fireEvent.submit(form)


        expect(testHandleSubmit).toHaveBeenCalledTimes(1)
        expect(screen.getByText("Mes notes de frais")).toBeTruthy();
      })
    })
  })
})
