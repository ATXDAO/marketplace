import { ChevronDownIcon } from "@heroicons/react/solid";
import { Menu, Transition } from "@headlessui/react";
import { OrderDirection } from "../../generated/marketplace.graphql";
import { useRouter } from "next/router";
import Link from "next/link";
import React from "react";
import classNames from "clsx";

type SortOption = {
  name: string;
  direction: OrderDirection;
  value: string;
};

type SortMenuProps = {
  mobileFilterButtonSlot?: JSX.Element;
  options: SortOption[];
};

function QueryLink(
  props: React.ComponentProps<typeof Link> & { className: string }
) {
  const { href, children, ...rest } = props;

  return (
    <Link href={href} passHref>
      <a {...rest}>{children}</a>
    </Link>
  );
}

export function SortMenu({ mobileFilterButtonSlot, options }: SortMenuProps) {
  const router = useRouter();
  const { pathname, query } = router;

  return (
    <Menu as="div" className="relative z-20 inline-block text-left">
      <div className="flex items-center space-x-2">
        <Menu.Button className="group inline-flex justify-center text-sm font-medium text-gray-700 hover:text-gray-900 dark:text-gray-500 dark:hover:text-gray-200">
          Sort
          <ChevronDownIcon
            className="flex-shrink-0 -mr-1 ml-1 h-5 w-5 text-gray-400 group-hover:text-gray-500 dark:text-gray-400 dark:group-hover:text-gray-100"
            aria-hidden="true"
          />
        </Menu.Button>
        {mobileFilterButtonSlot}
        {/* <MobileFilterButton /> */}
      </div>

      <Transition
        as={React.Fragment}
        enter="transition ease-out duration-100"
        enterFrom="transform opacity-0 scale-95"
        enterTo="transform opacity-100 scale-100"
        leave="transition ease-in duration-75"
        leaveFrom="transform opacity-100 scale-100"
        leaveTo="transform opacity-0 scale-95"
      >
        <Menu.Items className="origin-top-left absolute right-0 z-10 mt-2 w-56 rounded-md shadow-2xl bg-white dark:bg-gray-700 ring-1 ring-black ring-opacity-5 focus:outline-none">
          <div className="py-1">
            {options.map((option, index) => {
              // console.log(router);
              const sort = [option.value, option.direction].join(":");
              const active = query.sort ? query.sort === sort : index === 0;

              return (
                <Menu.Item key={option.name}>
                  <QueryLink
                    href={{
                      pathname,
                      query: {
                        ...query,
                        sort,
                      },
                    }}
                    // passHref
                    className={classNames(
                      "block px-4 py-2 text-sm font-medium text-gray-900 dark:text-gray-500",
                      {
                        "text-red-500 dark:text-gray-100": active,
                      }
                    )}
                  >
                    <span>{option.name}</span>
                  </QueryLink>
                </Menu.Item>
              );
            })}
          </div>
        </Menu.Items>
      </Transition>
    </Menu>
  );
}
