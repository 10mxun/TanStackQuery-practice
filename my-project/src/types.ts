export interface Post {
  id: number;
  userId: number;
  title: string;
  body: string;
}

export interface SavePostInput {
  id?: number;
  title: string;
  body: string;
  userId: number;
}
