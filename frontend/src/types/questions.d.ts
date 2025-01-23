

export type answer = {
    id: number,
    answer: string,
    likes: number, // there is an object in here
    answeredBy?: string
    answered_by_id?: number,
    question_id: number,
}

export type question = {
    id: number,
    question: string,
    askedBy?: string,
    asked_by_id: number?,
    answers: answer[]
}