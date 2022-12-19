import Image from 'next/image';
import Link from 'next/link';
import {useRouter} from 'next/router';
import React, {Fragment, useState} from 'react';
import useCollapse from 'react-collapsed';
import {BiGlobe} from 'react-icons/bi';
import {BsArrowsFullscreen, BsPlayCircle} from 'react-icons/bs';
import {CgExternal} from 'react-icons/cg';
import {GoChevronRight} from 'react-icons/go';
import styled from 'styled-components';

import {PRODUCT} from '../../../../constants';
import NavItems from '../../../../src/data/nav.json';

interface IRoute {
  title: string | null;
  path: string;
  icon: string;
  routes?: IRoute[];
  external?: boolean;
}
interface IRoutes {
  title: string;
  path: string;
  routes: IRoute[];
}

function Accordion({
  route,
  isActive,
  onSelect,
  depth,
  currentRoutePath,
}: {
  route: IRoute;
  isActive: boolean;
  onSelect: () => void;
  depth: number;
  currentRoutePath: string;
}) {
  const {getCollapseProps, getToggleProps} = useCollapse({
    isExpanded: isActive,
  });

  return (
    <li className="sidenav-item" data-comp="accordion" data-expanded={isActive}>
      <div className="sidenav-menu__container">
        {/* Toggle */}
        {route.external ? (
          <a
            href={route.path}
            className="sidenav-link menu-toggle__wrap"
            target="_blank"
            rel="noopener noreferrer">
            <span> {route.title}</span>
            <div className="icon-chevron">
              <CgExternal />
            </div>
          </a>
        ) : (
          route.title && (
            <Link
              href={`/guides/${route.path}`}
              passHref
              className="sidenav-link"
              data-depth={depth}>
              <a
                className="menu-toggle__wrap"
                data-is-highlighted={
                  currentRoutePath.replace('/guides/', '') === route.path
                }
                {...getToggleProps({
                  onClick: onSelect,
                })}>
                {depth === 0 && (
                  <div className="icons">
                    <div id="dark-theme">
                      <Image
                        src={`/icons/${route.icon}.svg`}
                        alt={route.icon}
                        width="16px"
                        height="16px"
                        priority
                      />
                    </div>
                    <div id="light-theme">
                      <Image
                        src={`/icons/${route.icon}-dark.svg`}
                        alt={route.icon}
                        width="16px"
                        height="16px"
                        priority
                      />
                    </div>
                  </div>
                )}
                <span>{route.title}</span>
                {route.routes && (
                  <div className="icon-chevron">
                    <GoChevronRight />
                  </div>
                )}
              </a>
            </Link>
          )
        )}
        {/* Collapse */}
        {route.routes && (
          // ?? can this be a single component that returns its children?
          <ul
            className="sidenav-sublist"
            {...{'data-nav-depth': depth + 1, ...getCollapseProps()}}>
            <AccordionParent {...{routes: route.routes, depth: depth + 1}} />
          </ul>
        )}
      </div>
    </li>
  );
}

function getCurrentRouteIndex(
  routes: IRoute[],
  depth: number,
  currentRoutePath: string
) {
  return routes.findIndex((route) => {
    const _route = route.path.split('/')[route.path.split('/').length - 1];
    const _crp = currentRoutePath.split('/')[depth];
    return _route == _crp;
  });
}

function AccordionParent({routes, depth}: {routes: IRoute[]; depth: number}) {
  const router = useRouter();
  const currentRoutePath = router.pathname.replace('/guides/', '');
  const [activeIndex, setActiveIndex] = useState<number | null>(() =>
    getCurrentRouteIndex(routes, depth, currentRoutePath)
  );

  return (
    <>
      {routes.map((route, index) => {
        return (
          <Fragment key={index}>
            <Accordion
              {...{
                route,
                currentRoutePath,
                isActive: activeIndex === index,
                onSelect: () =>
                  setActiveIndex(activeIndex === index ? null : index),
                depth,
              }}
            />
          </Fragment>
        );
      })}
    </>
  );
}

const StyledSideNav = styled.div`
  display: flex;
  row-gap: 2rem;
  flex-direction: column;
  background: var(--bg-secondary);
  width: calc(100%);
  margin: 0px auto;
  border-radius: 4px;
  padding: calc(var(--header-height) / 2) 0;
  height: calc(100% - 8px);
  overflow: auto;

  ul:not([data-nav-depth='0']) {
    position: absolute;

    ::before {
      content: '';
      position: absolute;
      height: calc(100% - 10px);
      top: 5px;
      width: 1px;
      background-color: var(--hr-primary);
      left: 8px;
    }
  }

  [aria-expanded='true'] {
    font-weight: 700 !important;
    color: var(--colors-blue0) !important;

    .icon-chevron {
      transform: translateX(-20px) rotate(90deg);
    }
  }

  [aria-expanded='false'][data-is-highlighted='true'] {
    font-weight: 700 !important;
    color: var(--colors-blue0) !important;
  }

  .sidenav-sublist {
    list-style: none;
    padding: 0px;

    :first-of-type {
      flex: 1 1 0%;
      /* overflow-y: auto; */

      + hr {
        height: 1px;
        border: none;
        background: var(--hr-primary);
      }
    }
  }

  .sidenav-sublist [data-nav-depth='1'] {
    margin-left: calc(16px + 20px);
  }

  .sidenav-sublist [data-nav-depth='2'] {
    margin-left: calc(16px);
  }

  .menu-toggle__wrap {
    display: grid;
    align-items: center;
    background: transparent;
    border: medium none;
    width: 100%;
    text-decoration: none;
    text-align: left;
    padding: 5px 16px;
    column-gap: 10px;
    position: relative;
    cursor: pointer;
    border-radius: 2px;
    color: var(--sidebar-link-primary);
    grid-template-columns: auto 1fr auto;
    font-size: 14px;
    font-weight: 400;
  }

  .menu-toggle__wrap:hover {
    color: var(--colors-blue0);
  }

  .menu-toggle__wrap + .sidenav-sublist {
    position: relative;
    overflow: hidden;
  }

  .menu-toggle__wrap.header {
    cursor: default;
    color: var(--sidebar-link-primary);
    font-weight: 500;
  }

  .sidenav-menu__container:empty {
    height: 1px;
    width: calc(100% - 32px);
    background: var(--hr-primary);
    transform: translateX(16px);
    opacity: 0.6;
    padding: 0;
    margin: 2px 0;
  }

  .icon-box {
    display: flex;
    justify-content: center;
    width: 16px;
    height: 16px;
    align-items: center;
    justify-content: center;
  }

  .icon-chevron {
    transition: 100ms ease-in-out;
    position: absolute;
    right: 0;
    transform: translateX(-20px);
  }
`;

const links = [
  {
    title: 'Uplynk',
    path: 'https://docs.edgecast.com/video?sgId=7bc47c45-c1d6-4189-b416-552581d86006',
    icon: BsPlayCircle,
  },
  {
    title: 'Limelight Delivery',
    path: 'https://support.limelight.com/public/en/Default.htm?sgId=7bc47c45-c1d6-4189-b416-552581d86006',
    icon: BiGlobe,
  },
  {
    title: 'Edgecast Delivery',
    path: 'https://docs.edgecast.com/cdn?sgId=7bc47c45-c1d6-4189-b416-552581d86006',
    icon: BsArrowsFullscreen,
  },
  {
    title: `${PRODUCT} v4`,
    path: 'https://dpcs.layer0.co/?sgId=7bc47c45-c1d6-4189-b416-552581d86006',
    icon: 'edgio',
  },
];

export default function SideNav() {
  return (
    <StyledSideNav className="custom-scrollbar">
      <ul className="sidenav-sublist" data-nav-depth="0">
        <AccordionParent routes={(NavItems as IRoutes).routes} depth={0} />
      </ul>
      <hr />
      <ul className="sidenav-sublist" data-nav-depth="0">
        <li className="sidenav-item">
          <div className="sidenav-menu__container">
            <span className="sidenav-link menu-toggle__wrap header">
              Additional Documentation
            </span>
          </div>
        </li>
        {links.map((link) => {
          const Icon = typeof link.icon === 'string' ? null : link.icon;

          return (
            <li key={link.path} className="sidenav-item">
              <div className="sidenav-menu__container">
                <a
                  href={link.path}
                  className="sidenav-link menu-toggle__wrap"
                  target="_blank"
                  rel="noopener noreferrer">
                  <div className="icons">
                    <div id="dark-theme">
                      {!Icon ? (
                        <Image
                          src={`/icons/${link.icon}.svg`}
                          alt={link.title}
                          width="16px"
                          height="16px"
                          priority
                        />
                      ) : (
                        <Icon />
                      )}
                    </div>
                    <div id="light-theme">
                      {!Icon ? (
                        <Image
                          src={`/icons/${link.icon}-dark.svg`}
                          alt={link.title}
                          width="16px"
                          height="16px"
                          priority
                        />
                      ) : (
                        <Icon />
                      )}
                    </div>
                  </div>
                  <span>{link.title}</span>
                  <div className="icon-chevron">
                    <CgExternal />
                  </div>
                </a>
              </div>
            </li>
          );
        })}
      </ul>
    </StyledSideNav>
  );
}
