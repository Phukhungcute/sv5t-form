type ArticleImageProps = {
  src: string;
  alt: string;
  description: string;
};

export default function ArticleImage({
  src,
  alt,
  description,
}: ArticleImageProps) {
  return (
    <figure className="mx-auto my-8 w-full max-w-3xl">
      <img
        src={src}
        alt={alt}
        className="h-auto w-full object-cover shadow-sm"
      />

      <figcaption className="mt-3 text-center text-sm italic leading-6 text-gray-500">
        {description}
      </figcaption>
    </figure>
  );
}