import "./main.css";
// @ts-ignore
if (module.hot) {
  // @ts-ignore
  module.hot.accept();
}

interface Draggable {
  dragStart(e: DragEvent): void;
  dragEnd(e: DragEvent): void;
}

interface DragTarget {
  dragOver(e: DragEvent): void;
  dragDrop(e: DragEvent): void;
  dragLeave(e: DragEvent): void;
}

enum ProjectStatus {
  Active,
  Finished,
}

type Listener<T> = (items: T[]) => void;

class Project {
  constructor(public id: string, public title: string, public description: string, public people: number, public status: ProjectStatus) {}
}

class State<T> {
  protected listeners: Listener<T>[] = [];

  addListener(listenerFn: Listener<T>) {
    this.listeners.push(listenerFn);
  }
}

class ProjectState extends State<Project> {
  private projects: Project[] = [];
  private static instance: ProjectState;

  private constructor() {
    super();
  }

  static createInstance() {
    if (this.instance) {
      return this.instance;
    }
    this.instance = new ProjectState();
    return this.instance;
  }

  addProject(title: string, description: string, people: number) {
    const newProject = new Project(Math.random().toString(), title, description, people, ProjectStatus.Active);
    this.projects.push(newProject);
    this.updateListeners();
  }

  moveItem(id: string, newStatus: ProjectStatus) {
    const project = this.projects.find((prj) => prj.id === id);
    if (project && project.status !== newStatus) {
      project.status = newStatus;
      this.updateListeners();
    }
  }

  updateListeners() {
    for (const listenerFn of this.listeners) {
      listenerFn(this.projects.slice());
    }
  }
}

const instance = ProjectState.createInstance();

interface ValidateObj {
  value: string | number;
  required?: boolean;
  maxLength?: number;
  minLength?: number;
  max?: number;
  min?: number;
}

function validate(obj: ValidateObj) {
  let isValid = true;
  if (obj.required) {
    isValid = isValid && obj.value.toString().trim().length !== 0;
  }
  if (obj.maxLength != null && typeof obj.value === "string") {
    isValid = isValid && obj.maxLength > obj.value.toString().trim().length;
  }
  if (obj.minLength != null && typeof obj.value === "string") {
    isValid = isValid && obj.minLength < obj.value.toString().trim().length;
  }
  if (obj.max != null && typeof obj.value === "number") {
    isValid = isValid && obj.max > obj.value;
  }
  if (obj.min != null && typeof obj.value === "number") {
    isValid = isValid && obj.min < obj.value;
  }
  return isValid;
}

function autoBind(_: any, _2: string, descriptor: PropertyDescriptor) {
  const originalMethod = descriptor.value;
  const adjDescriptor: PropertyDescriptor = {
    configurable: true,
    get() {
      return originalMethod.bind(this);
    },
  };
  return adjDescriptor;
}

abstract class Component<T extends HTMLElement, U extends HTMLElement> {
  templateElement: HTMLTemplateElement;
  hostElement: T;
  element: U;

  constructor(templateId: string, hostElementId: string, insertAtStart: boolean, newElementId?: string) {
    this.templateElement = <HTMLTemplateElement>document.getElementById(templateId);
    this.hostElement = <T>document.getElementById(hostElementId);
    const importNode = document.importNode(this.templateElement.content, true);
    this.element = <U>importNode.firstElementChild;
    if (newElementId) {
      this.element.id = newElementId;
    }
    this.attach(insertAtStart);
  }

  private attach(insert: boolean) {
    this.hostElement.insertAdjacentElement(insert ? "afterbegin" : "beforeend", this.element);
  }

  abstract configure(): void;
  abstract renderContent(): void;
}

class ProjectItem extends Component<HTMLUListElement, HTMLLIElement> implements Draggable {
  project: Project;

  private get people() {
    if (this.project.people === 1) {
      return "1 person";
    } else {
      return `${this.project.people} persons`;
    }
  }
  constructor(hostId: string, project: Project) {
    super("single-project", hostId, false, project.id);
    this.project = project;
    this.configure();
    this.renderContent();
  }

  @autoBind
  dragStart(e: DragEvent): void {
    e.dataTransfer?.setData("text/plain", this.project.id);
    e.dataTransfer!.effectAllowed = "move";
  }
  dragEnd(e: DragEvent): void {
    console.log("end");
  }

  configure(): void {
    this.element.addEventListener("dragstart", this.dragStart);
    this.element.addEventListener("dragend", this.dragEnd);
  }
  renderContent(): void {
    this.element.querySelector("h2")!.textContent = this.project.title;
    this.element.querySelector("h3")!.textContent = this.people;
    this.element.querySelector("p")!.textContent = this.project.description;
  }
}

class ProjectList extends Component<HTMLDivElement, HTMLElement> implements DragTarget {
  assignedProjects: Project[] = [];
  constructor(private type: "active" | "finished" = "active") {
    super("project-list", "app", false, `${type}-projects`);

    this.configure();
    this.renderContent();
  }

  private renderProjects() {
    const listEl = <HTMLUListElement>document.getElementById(`${this.type}-projects-list`);
    listEl.innerHTML = "";
    for (const project of this.assignedProjects) {
      new ProjectItem(this.element.querySelector("ul")!.id, project);
    }
  }

  renderContent() {
    const listId = `${this.type}-projects-list`;
    this.element.querySelector("ul")!.id = listId;
    this.element.querySelector("h2")!.textContent = this.type.toUpperCase() + " PROJECTS";
  }
  @autoBind
  dragOver(e: DragEvent): void {
    if (e.dataTransfer && e.dataTransfer.types[0] === "text/plain") {
      e.preventDefault();
      const listEl = this.element.querySelector("ul")!;
      listEl.classList.add("droppable");
    }
  }
  @autoBind
  dragDrop(e: DragEvent): void {
    const id = e.dataTransfer!.getData("text/plain");
    instance.moveItem(id, this.type === "active" ? ProjectStatus.Active : ProjectStatus.Finished);
  }
  @autoBind
  dragLeave(e: DragEvent): void {
    const listEl = this.element.querySelector("ul")!;
    listEl.classList.remove("droppable");
  }

  configure(): void {
    this.element.addEventListener("dragover", this.dragOver);
    this.element.addEventListener("drop", this.dragDrop);
    this.element.addEventListener("dragleave", this.dragLeave);
    instance.addListener((projects: Project[]) => {
      const relevantProjects = projects.filter((prj) => {
        if (this.type === "active") {
          return prj.status === ProjectStatus.Active;
        }
        return prj.status === ProjectStatus.Finished;
      });
      this.assignedProjects = relevantProjects;
      this.renderProjects();
    });
  }
}

class ProjectInput extends Component<HTMLDivElement, HTMLFormElement> {
  titleInputElement: HTMLInputElement;
  descriptionInputElement: HTMLInputElement;
  peopleElement: HTMLInputElement;
  constructor() {
    super("project-input", "app", true, "user-input");

    this.titleInputElement = <HTMLInputElement>this.element.querySelector("#title");
    this.descriptionInputElement = <HTMLInputElement>this.element.querySelector("#description");
    this.peopleElement = <HTMLInputElement>this.element.querySelector("#people");
    this.configure();
    this.renderContent();
  }

  private gatherUserInput(): [string, string, number] | void {
    const enteredTitle = this.titleInputElement.value;
    const enteredDescription = this.descriptionInputElement.value;
    const enteredPeople = this.peopleElement.value;

    const validateTitle: ValidateObj = {
      value: enteredTitle,
      required: true,
    };

    const validateDescription: ValidateObj = {
      value: enteredDescription,
      required: true,
      minLength: 5,
    };

    const validatePeople: ValidateObj = {
      value: +enteredPeople,
      required: true,
      min: 1,
      max: 5,
    };

    if (!validate(validateTitle) || !validate(validateDescription) || !validate(validatePeople)) {
      alert("invalid user input");
      return;
    }
    return [enteredTitle, enteredDescription, +enteredPeople];
  }

  private clearInputs() {
    this.titleInputElement.value = "";
    this.descriptionInputElement.value = "";
    this.peopleElement.value = "";
  }

  @autoBind
  private submitHandler(e: Event) {
    e.preventDefault();
    const userInput = this.gatherUserInput();
    if (Array.isArray(userInput)) {
      const [title, desc, people] = userInput;
      instance.addProject(title, desc, people);
      this.clearInputs();
    }
  }

  configure() {
    this.element.addEventListener("submit", this.submitHandler);
  }

  renderContent(): void {}
}

new ProjectInput();
new ProjectList();
new ProjectList("finished");
