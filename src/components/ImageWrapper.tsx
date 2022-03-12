import Image from "next/image";
import { generateIpfsLink } from "../utils";

type ImageWrapperProps = Pick<
  JSX.IntrinsicElements["img"],
  "aria-hidden" | "className" | "height" | "width"
> & {
  src?: string;
  token: {
    name?: string | null;
    metadata?: {
      attributes?: Array<{
        attribute: {
          name: string;
          percentage: string | null;
          value: string;
        };
      }> | null;
      description: string;
      image: string;
    } | null;
  };
};

function getDynamicImage(token: ImageWrapperProps["token"], name: string) {
  const attribute = token.metadata?.attributes?.find(
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore-error
    (item) => item.attribute?.name === name || item.name === name
  );

  return generateIpfsLink(
    `${token.metadata?.image.slice(0, -5)}${
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore-error
      attribute?.attribute?.value ?? attribute?.value
    }.png`
  );
}

export default function ImageWrapper({
  src,
  token,
  ...props
}: ImageWrapperProps) {
  return (
    <Image
      alt={token.name ?? ""}
      src={
        src ??
        (token.metadata?.description === "Smol Brains Land"
          ? generateIpfsLink(
              "ipfs://QmUcEoYHwye65tsncGAtoz2bQLjQtrE2GiCa6L1PYNcbh7/0.png"
            )
          : token.metadata?.description === "Smol Brains"
          ? getDynamicImage(token, "Head Size")
          : token.metadata?.description === "Smol Bodies"
          ? getDynamicImage(token, "Swol Size")
          : token.metadata?.image.includes("ipfs")
          ? generateIpfsLink(token.metadata.image)
          : token.metadata?.image ?? "")
      }
      layout={Boolean(props.width) ? undefined : "fill"}
      {...props}
    />
  );
}
