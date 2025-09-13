interface User {
  id: number
  name: string
  email: string
}

interface Role {
  id: number
  name: string
}

export interface ClientUser {
  id: number
  user: User | null
  role: Role | null
}

export interface CreateClientUserDto {
  client_id: number
  user_id: number
  role_id: number
}

export interface UpdateClientUserDto {
  role_id: number
}
