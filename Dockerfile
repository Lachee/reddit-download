FROM node:24-alpine AS build
WORKDIR /app
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable
RUN corepack prepare pnpm@11.5.2 --activate
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
ENV SVELTE_ADAPTER=node
RUN pnpm build && pnpm prune --prod

FROM node:24-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000

# Install ffmpeg for video processing
RUN apk add --no-cache ffmpeg

# Copy only the necessary files from the build stage
COPY --from=build /app/build ./build
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/node_modules ./node_modules

# Run the application
EXPOSE 3000
CMD ["node", "build"]
