-- CreateTable
CREATE TABLE "PostUser" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "userName" TEXT NOT NULL,

    CONSTRAINT "PostUser_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PostUser_email_id_idx" ON "PostUser"("email", "id");

-- CreateIndex
CREATE INDEX "PostUser_userName_id_idx" ON "PostUser"("userName", "id");

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_userId_fkey" FOREIGN KEY ("userId") REFERENCES "PostUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
