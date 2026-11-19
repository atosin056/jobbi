import type { RowDataPacket } from "mysql2";
export default interface User extends RowDataPacket {
    id: number;
    firstName: string;
    lastName: string;
    userId: number;
    chatId: number;
    createdAt: Date;
    updatedAt: Date;
}